<?php
/**
 * Plugin Name: Partner Zone API
 * Description: Adds custom REST API endpoints for the Partner Zone React application.
 * Version: 1.2
 * Author: Maksim Kamenskii
 */

// Prevent direct access
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Include the JWT library only if it's not already loaded
if ( ! class_exists( 'Firebase\JWT\JWT' ) && file_exists( __DIR__ . '/vendor/autoload.php' ) ) {
    require_once __DIR__ . '/vendor/autoload.php';
}

use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * Register Custom Post Type for Quotes
 */
add_action('init', 'pz_register_quote_cpt');

function pz_register_quote_cpt() {
    $labels = array(
        'name'                  => _x( 'Partner Quotes', 'Post type general name', 'partner-zone' ),
        'singular_name'         => _x( 'Partner Quote', 'Post type singular name', 'partner-zone' ),
        'menu_name'             => _x( 'Partner Quotes', 'Admin Menu text', 'partner-zone' ),
        'name_admin_bar'        => _x( 'Partner Quote', 'Add New on Toolbar', 'partner-zone' ),
    );
    $args = array(
        'labels'             => $labels,
        'public'             => false, // Not publicly queryable via default WP queries
        'publicly_queryable' => false,
        'show_ui'            => true, // Show in admin UI
        'show_in_menu'       => true,
        'query_var'          => false,
        'rewrite'            => false,
        'capability_type'    => 'post',
        'has_archive'        => false,
        'hierarchical'       => false,
        'menu_position'      => 25,
        'menu_icon'          => 'dashicons-analytics',
        'supports'           => array( 'title', 'author' ), // Only need title and author support
        'show_in_rest'       => false, // We use custom endpoints
    );
    register_post_type( 'partner_quote', $args );
}

/**
 * JWT Authentication Permission Callback Helper
 *
 * Verifies the JWT token from the Authorization header.
 * Sets the current user if the token is valid.
 *
 * @param WP_REST_Request $request
 * @return bool|WP_Error True if authenticated, WP_Error otherwise.
 */
function pz_check_jwt_auth(WP_REST_Request $request) {
    $auth_header = $request->get_header('Authorization');

    if (!$auth_header) {
        return new WP_Error('rest_unauthorized', 'Заголовок Authorization не найден.', array('status' => 401)); // Russian
    }

    // Check if it's a Bearer token
    if (!preg_match('/Bearer\s(\S+)/', $auth_header, $matches)) {
        return new WP_Error('rest_unauthorized', 'Неверный формат заголовка Authorization.', array('status' => 401)); // Russian
    }

    $token = $matches[1];
    if (!$token) {
         return new WP_Error('rest_unauthorized', 'Токен не найден в заголовке Authorization.', array('status' => 401)); // Russian
    }

    // Get secret key
    if (!defined('PZ_JWT_SECRET_KEY') || empty(PZ_JWT_SECRET_KEY)) {
        error_log('Partner Zone API: PZ_JWT_SECRET_KEY is not defined in wp-config.php for token verification!');
        return new WP_Error('rest_server_error', 'Ошибка конфигурации сервера.', array('status' => 500)); // Russian
    }
    $secret_key = PZ_JWT_SECRET_KEY;

    try {
        $decoded = JWT::decode($token, new Key($secret_key, 'HS256'));

        // Check if user ID exists in the token data
        if (!isset($decoded->data->user_id)) {
             return new WP_Error('rest_invalid_token', 'Недействительные данные токена (отсутствует user_id).', array('status' => 403)); // Russian
        }

        $user_id = absint($decoded->data->user_id);
        $user = get_userdata($user_id);

        if (!$user) {
            return new WP_Error('rest_invalid_token', 'Недействительный ID пользователя в токене.', array('status' => 403)); // Russian
        }

        // Set the current user for WordPress context within this request
        wp_set_current_user($user_id);
        return true; // Authentication successful

    } catch (ExpiredException $e) {
        return new WP_Error('rest_token_expired', 'Срок действия токена истек.', array('status' => 403)); // Russian
    } catch (SignatureInvalidException $e) {
        return new WP_Error('rest_invalid_signature', 'Недействительная подпись токена.', array('status' => 403)); // Russian
    } catch (Exception $e) {
        error_log('Partner Zone API: JWT Decode Error - ' . $e->getMessage());
        return new WP_Error('rest_invalid_token', 'Недействительный токен.', array('status' => 403)); // Russian
    }
}

/**
 * Register Custom REST API Routes
 */
add_action('rest_api_init', 'pz_register_routes');

function pz_register_routes() {
    // Log that the route registration function is running
    error_log('Partner Zone API: pz_register_routes action fired.');

    $namespace = 'partner-zone/v1';

    // Registration Endpoint
    error_log('Partner Zone API: Attempting to register POST /register route.'); // Log before register
    register_rest_route($namespace, '/register', array(
        'methods'             => 'POST',
        'callback'            => 'pz_handle_registration',
        'permission_callback' => '__return_true', // Allow public access
        'args'                => array(
             'first_name' => array(
                'required' => true,
                'validate_callback' => function($param, $request, $key) {
                    return is_string($param) && !empty(trim($param));
                },
                'sanitize_callback' => 'sanitize_text_field',
             ),
             'last_name' => array(
                'required' => true,
                'validate_callback' => function($param, $request, $key) {
                    return is_string($param) && !empty(trim($param));
                },
                'sanitize_callback' => 'sanitize_text_field',
             ),
            'email' => array(
                'required'          => true,
                'validate_callback' => function( $param, $request, $key ) {
                    return is_email( $param );
                },
                'sanitize_callback' => 'sanitize_email',
            ),
            'password' => array(
                'required'          => true,
                'validate_callback' => function( $param, $request, $key ) {
                    // Basic password strength check (e.g., minimum length)
                    return is_string( $param ) && strlen( $param ) >= 8;
                },
                'sanitize_callback' => 'sanitize_text_field', // Passwords aren't typically sanitized like text, but keep basic filter
            ),
            'company_name' => array(
                 'required' => false, // Make optional or required as needed
                 'validate_callback' => function($param, $request, $key) {
                     return is_string($param);
                 },
                 'sanitize_callback' => 'sanitize_text_field',
             ),
             'phone_number' => array(
                 'required' => false, // Make optional or required as needed
                 'validate_callback' => function($param, $request, $key) {
                     // Basic phone format check (allows numbers, spaces, +, -, ())
                     return is_string($param) && preg_match('/^[0-9\s\+\-\(\)]+$/', $param);
                 },
                 'sanitize_callback' => 'sanitize_text_field',
             ),
             'website' => array(
                 'required' => true, // Make mandatory
                 'validate_callback' => function($param, $request, $key) {
                     // Ensure it's not empty and looks like a URL
                     return !empty(trim($param)) && filter_var($param, FILTER_VALIDATE_URL);
                 },
                 'sanitize_callback' => 'esc_url_raw', // Use URL sanitization
             ),
        ),
    ));
    error_log('Partner Zone API: POST /register route registration attempted.'); // Log after register

    // Login Endpoint
    error_log('Partner Zone API: Attempting to register POST /login route.'); // Log before register
    register_rest_route($namespace, '/login', array(
        'methods'             => 'POST',
        'callback'            => 'pz_handle_login',
        'permission_callback' => '__return_true', // Allow public access
        'args'                => array(
            'username' => array( // Changed from email to username for flexibility
                'required'          => true,
                'validate_callback' => function( $param, $request, $key ) {
                    return is_string( $param ) && ! empty( $param );
                },
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'password' => array(
                'required'          => true,
                'validate_callback' => function( $param, $request, $key ) {
                    return is_string( $param ) && ! empty( $param );
                },
                 // No sanitize callback for password comparison
            ),
        ),
    ));
    error_log('Partner Zone API: POST /login route registration attempted.'); // Log after register

    // Email Verification Endpoint
    register_rest_route( $namespace, '/verify-email', array(
        'methods'             => 'GET',
        'callback'            => 'pz_handle_email_verification',
        'permission_callback' => '__return_true', // Publicly accessible link
        'args'                => array(
            'token' => array(
                'required'          => true,
                'validate_callback' => function($param) { return is_string($param) && !empty($param); },
                'sanitize_callback' => 'sanitize_text_field',
            ),
            'user_id' => array(
                'required'          => true,
                'validate_callback' => function($param) { return is_numeric($param) && $param > 0; },
                'sanitize_callback' => 'absint', // Sanitize as absolute integer
            ),
        ),
    ));

    // --- Request Password Reset Route --- (New)
    register_rest_route($namespace, '/request-password-reset', array(
        'methods' => 'POST',
        'callback' => 'pz_handle_request_password_reset',
        'permission_callback' => '__return_true', // Public endpoint
        'args' => array(
            'email' => array(
                'required' => true,
                'sanitize_callback' => 'sanitize_email',
                'validate_callback' => 'is_email'
            ),
        ),
    ));

    // --- Reset Password Route --- (New)
    register_rest_route($namespace, '/reset-password', array(
        'methods' => 'POST',
        'callback' => 'pz_handle_reset_password',
        'permission_callback' => '__return_true', // Public endpoint
        'args' => array(
            'key' => array(
                'required' => true,
                'sanitize_callback' => 'sanitize_text_field'
            ),
            'login' => array( // User's login/email sent in the URL
                'required' => true,
                'sanitize_callback' => 'sanitize_text_field' // Can be email or username
            ),
            'password' => array( // The new password
                'required' => true,
                'validate_callback' => function($param, $request, $key) {
                    return !empty($param) && strlen($param) >= 8;
                }
                // No sanitize_callback for password before setting
            ),
        ),
    ));

    // --- Save Quote Route --- (New)
    register_rest_route($namespace, '/quotes', array(
        'methods' => 'POST',
        'callback' => 'pz_handle_save_quote',
        'permission_callback' => 'pz_check_jwt_auth', // Require authentication
         'args' => array(
            'quoteName' => array(
                'required' => true,
                'sanitize_callback' => 'sanitize_text_field',
                'validate_callback' => function($param) { return !empty(trim($param)); }
            ),
            'configData' => array( // Expecting the config details, likely as JSON or object
                'required' => true,
                 // No specific validation here, handled in callback. Sanitize carefully.
                 // Could add 'type' => 'object' or 'string' depending on how frontend sends it
            ),
             'totalCost' => array(
                'required' => true,
                // Use an anonymous function to correctly call is_numeric
                'validate_callback' => function($param, $request, $key) {
                    return is_numeric($param);
                }
                // Consider 'sanitize_callback' => 'floatval' or similar if needed
            ),
            'quoteType' => array(
                'required' => false,
                'validate_callback' => function($param) {
                    return is_string($param) || is_null($param);
                },
                'sanitize_callback' => function($param) {
                    return $param === null ? null : sanitize_text_field($param);
                },
            ),
        ),
    ));

     // --- List Quotes Route --- (New)
    register_rest_route($namespace, '/quotes', array(
        'methods' => 'GET',
        'callback' => 'pz_handle_get_quotes',
        'permission_callback' => 'pz_check_jwt_auth', // Require authentication
    ));

    // --- Get Single Quote Route --- (New)
    register_rest_route($namespace, '/quotes/(?P<id>\d+)', array(
        'methods' => 'GET',
        'callback' => 'pz_handle_get_single_quote',
        'permission_callback' => 'pz_check_jwt_auth', // Require authentication
        'args' => array(
            'id' => array(
                'validate_callback' => function($param, $request, $key) {
                    return is_numeric($param);
                }
            ),
        ),
    ));

    // --- Add Get User Data Endpoint --- (New)
    register_rest_route($namespace, '/user-data', array(
        'methods' => 'GET',
        'callback' => 'pz_get_user_data',
        'permission_callback' => 'pz_check_jwt_auth', // Require partner authentication
    ));
    error_log('Partner Zone API: GET /user-data route registration attempted.'); // Optional logging

    // --- Add Send Configuration Email Endpoint --- (New)
    register_rest_route($namespace, '/send-config-email', array( // Changed path slightly for clarity
        'methods' => 'POST',
        'callback' => 'pz_handle_send_config_email',
        'permission_callback' => 'pz_check_jwt_auth', // Require partner authentication
        // Add args validation if desired (optional but recommended)
    ));
    error_log('Partner Zone API: POST /send-config-email route registration attempted.');
}

/**
 * Handle User Registration Request
 *
 * @param WP_REST_Request $request Full details about the request.
 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error on failure.
 */
function pz_handle_registration( WP_REST_Request $request ) {
    $email = $request['email'];
    $password = $request['password'];
    $first_name = $request['first_name'];
    $last_name = $request['last_name'];
    $company_name = $request['company_name'];
    $phone_number = $request['phone_number'];
    $website = $request['website'];

    // Check if user already exists
    if ( email_exists( $email ) ) {
        return new WP_Error( 'registration_failed_email_exists', 'Email уже зарегистрирован.', array( 'status' => 409 ) ); // Russian
    }
    if ( username_exists( $email ) ) {
         // Technically redundant if email is username, but good practice
         return new WP_Error( 'registration_failed_username_exists', 'Имя пользователя (email) уже существует.', array( 'status' => 409 ) ); // Russian
    }

    // Create the user - use email as username
    $user_id = wp_create_user( $email, $password, $email );

    if ( is_wp_error( $user_id ) ) {
        // Log the specific error for debugging if needed
        // error_log('User creation failed: ' . $user_id->get_error_message());
        return new WP_Error( 'registration_failed', 'Ошибка регистрации пользователя.', array( 'status' => 500 ) ); // Russian
    }

    // --- Start New Verification/Approval Logic ---

    // Update user meta with names, company, phone
    update_user_meta($user_id, 'first_name', $first_name);
    update_user_meta($user_id, 'last_name', $last_name);
    if (!empty($company_name)) {
        update_user_meta($user_id, 'company_name', $company_name);
    }
     if (!empty($phone_number)) {
        update_user_meta($user_id, 'phone_number', $phone_number);
    }
    // Set display name
    wp_update_user( array( 'ID' => $user_id, 'display_name' => $first_name . ' ' . $last_name ) );

    // Generate verification token (expires in 24 hours)
    $token = wp_generate_password( 64, false ); // Longer, more secure token
    $expiry_timestamp = time() + DAY_IN_SECONDS; // DAY_IN_SECONDS is a WP constant

    // Store verification status and token
    update_user_meta( $user_id, '_pz_email_verified', false );
    update_user_meta( $user_id, '_pz_approval_status', 'pending' ); // 'pending', 'approved', 'rejected'
    update_user_meta( $user_id, '_pz_email_verification_token', $token );
    update_user_meta( $user_id, '_pz_email_token_expires', $expiry_timestamp );

    // Send verification email
    $verification_url = add_query_arg( array(
        'token'   => $token,
        'user_id' => $user_id,
    ), site_url( '/wp-json/partner-zone/v1/verify-email' ) ); // Point to our verification endpoint

    $subject = 'Подтвердите ваш Email для ' . get_bloginfo( 'name' ); // Russian Subject
    $message = "Здравствуйте, " . $first_name . ",\n\n"; // Russian Greeting
    $message .= "Спасибо за регистрацию на сайте " . get_bloginfo( 'name' ) . ".\n\n"; // Russian Thanks
    $message .= "Пожалуйста, перейдите по следующей ссылке, чтобы подтвердить ваш адрес электронной почты:\n"; // Russian Instruction
    $message .= $verification_url . "\n\n";
    $message .= "Эта ссылка действительна в течение 24 часов.\n\n"; // Russian Expiry
    $message .= "С уважением,\nКоманда " . get_bloginfo( 'name' ); // Russian Regards

    // Set content type to text/plain for simple emails
    add_filter( 'wp_mail_content_type', function() { return 'text/plain'; } );

    $mail_sent = wp_mail( $email, $subject, $message );

    // Remove the filter immediately after sending
    remove_filter( 'wp_mail_content_type', function() { return 'text/plain'; } );

    if ( ! $mail_sent ) {
        // Optional: Handle email sending failure (log it, maybe inform admin)
        // You might still return success to the user but log the issue
        error_log("Failed to send verification email to: " . $email . " for user ID: " . $user_id);
         // Decide if this is a critical error or not. Maybe delete the user or mark for retry?
         // For now, we'll proceed but the user can't verify.
    }

    // Return success message telling user to check email
    return wp_send_json_success( array(
        'message' => 'Регистрация прошла успешно! Пожалуйста, проверьте ваш email (' . $email . ') для подтверждения учетной записи.' // Russian
    ), 201 ); // 201 Created

    // --- End New Verification/Approval Logic ---
}

/**
 * Handle User Login Request (New)
 *
 * @param WP_REST_Request $request Full details about the request.
 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error on failure.
 */
function pz_handle_login( WP_REST_Request $request ) {
    $username = $request['username']; // Can be email or username
    $password = $request['password'];

    // Try authenticating
    $user = wp_authenticate_username_password( NULL, $username, $password ); // Use NULL for WP_User object or WP_Error

    // Check for WP_Error (invalid username, incorrect password)
    if ( is_wp_error( $user ) ) {
        // Distinguish between invalid user/pass and other errors if needed
        $error_code = $user->get_error_code();
        // Log other unexpected errors if needed
        // error_log('WP Authenticate Error: ' . $error_code . ' - ' . $user->get_error_message());
        return new WP_Error( 'login_failed_invalid_credentials', 'Неверное имя пользователя или пароль.', array( 'status' => 401 ) ); // Russian
    }

     // --- Start Updated Verification Checks ---

     // Check 1: Email Verification (Still Required for Login)
    if ( ! get_user_meta( $user->ID, '_pz_email_verified', true ) ) {
        return new WP_Error( 'login_failed_email_unverified', 'Ваша учетная запись ожидает подтверждения по email. Пожалуйста, проверьте свою почту.', array( 'status' => 403 ) ); // Russian
    }

     // Check 2: Manager Approval Status (REMOVED FOR LOGIN - Checked later for specific features)
     /*
     $approval_status = get_user_meta( $user->ID, '_pz_approval_status', true );
     if ( $approval_status !== 'approved' ) {
         // ... (error handling removed)
         return new WP_Error( 'login_failed_not_approved', $message, array( 'status' => 403 ) );
     }
     */

     // --- End Updated Verification Checks ---

     // --- If email check passes, proceed with JWT generation ---
     
     // Retrieve approval status to include in response
     $approval_status_for_response = get_user_meta( $user->ID, '_pz_approval_status', true ) ?: 'pending'; // Default to pending if somehow not set

    // Make sure JWT secret key is defined
    if ( ! defined( 'PZ_JWT_SECRET_KEY' ) ) {
         error_log('PZ_JWT_SECRET_KEY is not defined in wp-config.php for login!');
        return new WP_Error( 'jwt_error', 'Ошибка конфигурации сервера.', array( 'status' => 500 ) ); // Russian
    }
     // Check if JWT class exists
    if ( ! class_exists( 'Firebase\JWT\JWT' ) ) {
        error_log('Firebase JWT Library not loaded.');
        return new WP_Error( 'jwt_error', 'Ошибка зависимости сервера.', array( 'status' => 500 ) ); // Russian
    }

    // Prepare JWT payload
    $issuedAt  = time();
    $expire    = $issuedAt + DAY_IN_SECONDS; // Token valid for 1 day
    $serverName = get_site_url(); // Issuer

    $payload = array(
        'iss' => $serverName,                    // Issuer
        'iat' => $issuedAt,                     // Issued at
        'nbf' => $issuedAt,                     // Not before
        'exp' => $expire,                       // Expiration time
        'data' => array(
            'user_id' => $user->ID,
            'email'   => $user->user_email,
             // Add roles or other relevant non-sensitive data if needed
             // 'roles' => $user->roles,
        )
    );

    // Generate the JWT
    try {
        $jwt = JWT::encode( $payload, PZ_JWT_SECRET_KEY, 'HS256' ); // Use PZ_JWT_SECRET_KEY
    } catch (Exception $e) {
        error_log('JWT Encode Error: ' . $e->getMessage());
         return new WP_Error( 'jwt_encode_error', 'Не удалось создать токен доступа.', array( 'status' => 500 ) ); // Russian
    }

    // --- Log the data being sent --- 
    $response_data = array(
        'token' => $jwt,
        'user'  => array( 
            'id' => $user->ID,
            'user_email' => $user->user_email,
            'user_nicename' => $user->user_nicename,
            'user_display_name' => $user->display_name,
            'approval_status' => $approval_status_for_response // Add approval status
        ),
        'message' => 'Вход выполнен успешно.'
    );
    error_log('[Partner Zone Login] Preparing to send JSON success: ' . print_r($response_data, true));
    // --- End Logging ---

    // Return the JWT and user info, including approval status
    return wp_send_json_success( $response_data, 200 );
}

/**
 * Handle Request Password Reset Request (New)
 *
 * Uses WordPress core retrieve_password() function which handles
 * token generation, storage (transient), and email sending.
 *
 * @param WP_REST_Request $request Full details about the request.
 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error on failure.
 */
function pz_handle_request_password_reset(WP_REST_Request $request) {
    $email = $request['email'];

    // retrieve_password() returns true on success, WP_Error on failure
    $result = retrieve_password($email);

    if (is_wp_error($result)) {
        // Error: User not found or other issue
        $error_code = $result->get_error_code();
        // Provide a generic message to avoid revealing if an email exists
        // error_log("Password Reset Request Error for {$email}: " . $result->get_error_message()); // Log specific error for debugging
        return new WP_Error(
            'reset_request_failed', 
            'Если учетная запись с таким email существует, ссылка для сброса пароля была отправлена.', // Russian
            array('status' => 400) // Or 200 to not reveal email existence 
        );
    } elseif ($result === false) {
         // This case might indicate a problem with the email sending itself or filters
        error_log("retrieve_password returned false for email: {$email}");
        return new WP_Error(
            'reset_request_send_failed', 
            'Не удалось отправить письмо для сброса пароля. Пожалуйста, повторите попытку позже или обратитесь в поддержку.', // Russian
            array('status' => 500)
        );
    }

    // Success: retrieve_password() handled sending the email
    return wp_send_json_success(array(
        'message' => 'Если учетная запись с таким email существует, ссылка для сброса пароля была отправлена.' // Russian
    ), 200);
}

/**
 * Handle Actual Password Reset (New)
 *
 * Verifies the key/login and updates the user's password.
 *
 * @param WP_REST_Request $request Full details about the request.
 * @return WP_REST_Response|WP_Error Response object on success, or WP_Error on failure.
 */
function pz_handle_reset_password(WP_REST_Request $request) {
    $key = $request['key'];
    $login = $request['login'];
    $new_password = $request['password'];

    // Verify the reset key
    // Returns WP_Error on failure, User object on success
    $user = check_password_reset_key($key, $login);

    if (is_wp_error($user)) {
        // Handle specific errors from check_password_reset_key if needed
        $error_code = $user->get_error_code(); // e.g., 'invalid_key', 'expired_key'
        $error_message = 'Недействительная или просроченная ссылка для сброса пароля.'; // Russian Default
        if ($error_code === 'expired_key') {
             $error_message = 'Срок действия ссылки для сброса пароля истек.'; // Russian Expired
        }
         // error_log("Password Reset Check Error for {$login}: " . $user->get_error_message());
        return new WP_Error('reset_failed_key_check', $error_message, array('status' => 400));
    }

    // Key is valid, reset the password for the user object returned by check_password_reset_key
    reset_password($user, $new_password);

    // Password has been reset
    return wp_send_json_success(array(
        'message' => 'Пароль успешно сброшен. Теперь вы можете войти.' // Russian Success
    ), 200);
}

// --- Optional: Filter password reset email --- 
// Filter to change the reset link URL to point to our React app frontend page
add_filter('retrieve_password_message', 'pz_custom_retrieve_password_message', 10, 4);

function pz_custom_retrieve_password_message($message, $key, $user_login, $user_data) {
    // The default message contains a link like network_site_url("wp-login.php?action=rp&key=$key&login=" . rawurlencode($user_login), 'login')
    // We want to replace that link with one pointing to our frontend route
    
    $site_name = wp_specialchars_decode(get_option('blogname'), ENT_QUOTES);
    // Construct the frontend URL. Point to the main site's /reset-password route.
    $base_url = home_url(); // Use home_url for the site root
    $reset_url = $base_url . '/reset-password/?key=' . rawurlencode($key) . '&login=' . rawurlencode($user_login);

    // Create a new message (already seems mostly Russian)
    $new_message = __('Кто-то запросил сброс пароля для следующей учетной записи:') . "\r\n\r\n"; // Ensure Russian translation if needed
    $new_message .= sprintf(__('Сайт: %s'), $site_name) . "\r\n\r\n";
    $new_message .= sprintf(__('Имя пользователя: %s'), $user_login) . "\r\n\r\n";
    $new_message .= __('Если это ошибка, просто проигнорируйте это письмо, и ничего не произойдет.') . "\r\n\r\n";
    $new_message .= __('Чтобы сбросить пароль, перейдите по следующему адресу:') . "\r\n\r\n";
    $new_message .= '<' . $reset_url . '>' . "\r\n"; // Use the updated reset_url

    return $new_message;
}

/**
 * Handle Save Quote Request (New)
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function pz_handle_save_quote(WP_REST_Request $request) {
    $user_id = get_current_user_id();

    if (!$user_id) {
        return new WP_Error('rest_not_logged_in', 'Вы должны быть авторизованы, чтобы сохранять расчеты.', array('status' => 401));
    }

    $quote_name = $request->get_param('quoteName');
    $config_data_from_request = $request->get_param('configData'); // Raw configData object/array
    $total_cost = $request->get_param('totalCost');
    $top_level_quote_type = $request->get_param('quoteType'); // e.g., 'CRAC' or might be null for old DC

    // Determine quote type: from top level, or from within configData, default to DC
    $actual_quote_type = 'DC'; // Default to DC
    if (!empty($top_level_quote_type) && $top_level_quote_type === 'CRAC') {
        $actual_quote_type = 'CRAC';
    } elseif (isset($config_data_from_request['quoteType']) && $config_data_from_request['quoteType'] === 'CRAC') {
        $actual_quote_type = 'CRAC';
    }

    if (empty($quote_name) || is_null($config_data_from_request) || is_null($total_cost)) {
         error_log('Partner Zone Save Quote Error: Missing required parameters (quoteName, configData, or totalCost). Payload: ' . print_r($request->get_params(), true));
         return new WP_Error('missing_parameters', 'Отсутствуют обязательные данные для расчета: quoteName, configData, totalCost.', array('status' => 400));
    }

    $post_data = array(
        'post_title'    => wp_strip_all_tags($quote_name),
        'post_status'   => 'publish',
        'post_author'   => $user_id,
        'post_type'     => 'partner_quote',
    );

    $post_id = wp_insert_post($post_data, true);

    if (is_wp_error($post_id)) {
        error_log('Partner Zone Save Quote Error (wp_insert_post): ' . $post_id->get_error_message());
        return new WP_Error('quote_save_failed', 'Не удалось сохранить расчет (ошибка создания записи).', array('status' => 500));
    }

    try {
        // For both DC and CRAC, configData is stored in _partner_quote_config_json.
        // The structure within configData will differ based on actual_quote_type.
        $config_json_to_store = wp_json_encode($config_data_from_request, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        
        if ($config_json_to_store === false) {
            $json_error = json_last_error_msg();
            error_log('Partner Zone Save Quote Error (wp_json_encode): Failed to encode configData. Error: ' . $json_error . ' Data: ' . print_r($config_data_from_request, true));
            wp_delete_post($post_id, true); 
            return new WP_Error('json_encode_failed', 'Не удалось закодировать данные конфигурации. Ошибка: ' . $json_error, array('status' => 500));
        }

        update_post_meta($post_id, '_partner_quote_config_json', $config_json_to_store);
        update_post_meta($post_id, '_partner_quote_total_cost', floatval($total_cost));
        update_post_meta($post_id, '_pz_quote_type', $actual_quote_type); // Store the determined quote type

        // Log success with quote type
        error_log("Partner Zone: Successfully saved quote ID {$post_id} of type {$actual_quote_type}.");

    } catch (Exception $e) {
         error_log('Partner Zone Save Quote Error (Exception): ' . $e->getMessage());
         wp_delete_post($post_id, true);
         return new WP_Error('unexpected_error', 'Произошла непредвиденная ошибка при сохранении деталей расчета.', array('status' => 500));
    }

    return wp_send_json_success(array(
        'message' => 'Расчет успешно сохранен.',
        'quote_id' => $post_id,
        'quote_type_saved' => $actual_quote_type // Optionally return the type saved
    ), 201);
}

/**
 * Handle Get Quotes Request (New)
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function pz_handle_get_quotes(WP_REST_Request $request) {
    $user_id = get_current_user_id();

     if (!$user_id) {
        return new WP_Error('rest_not_logged_in', 'Вы должны быть авторизованы, чтобы просматривать расчеты.', array('status' => 401));
    }

    $args = array(
        'post_type' => 'partner_quote',
        'author' => $user_id,
        'posts_per_page' => -1, 
        'orderby' => 'date',
        'order' => 'DESC'
    );

    $query = new WP_Query($args);
    $quotes = array();

    if ($query->have_posts()) {
        while ($query->have_posts()) {
            $query->the_post();
            $post_id = get_the_ID();
            $quote_type_meta = get_post_meta($post_id, '_pz_quote_type', true);
            $actual_quote_type = !empty($quote_type_meta) ? $quote_type_meta : 'DC'; // Default to DC if meta not set (for older quotes)

            $quotes[] = array(
                'id' => $post_id, // Frontend expects string ID for CRAC, WP provides int. Frontend already casts.
                'name' => get_the_title(),
                'date' => get_the_date('c'), // Use ISO 8601 for consistency
                'total_cost' => floatval(get_post_meta($post_id, '_partner_quote_total_cost', true)),
                'quoteType' => $actual_quote_type,
                // No configData in list view to keep payload small
            );
        }
        wp_reset_postdata();
    }

    return wp_send_json_success($quotes, 200);
}

/**
 * Handle Get Single Quote Request (New)
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function pz_handle_get_single_quote(WP_REST_Request $request) {
    $user_id = get_current_user_id();
    // Frontend now sends string IDs from dashboard. Keep quote_id as string then cast to int for get_post.
    $quote_id_param = $request['id'];
    $quote_id = is_numeric($quote_id_param) ? (int) $quote_id_param : 0;

    if (!$user_id) {
        return new WP_Error('rest_not_logged_in', 'Вы должны быть авторизованы, чтобы просматривать расчеты.', array('status' => 401));
    }
    
    if ($quote_id === 0 && !str_starts_with($quote_id_param, 'CRAC-')) { // CRAC IDs are non-numeric string from frontend
        error_log('Partner Zone Get Single Quote: Invalid quote ID format received: ' . $quote_id_param);
        return new WP_Error('rest_invalid_id_format', 'Некорректный формат ID расчета.', array('status' => 400));
    }

    // For CRAC quotes, we need to adjust how we fetch them if they were not CPTs. 
    // However, now ALL quotes are CPTs. The ID from URL is the CPT ID.
    $post = get_post($quote_id); // This expects numeric CPT ID

    if (!$post || $post->post_type !== 'partner_quote') {
        return new WP_Error('rest_post_invalid_id', 'Недействительный ID расчета или тип.', array('status' => 404));
    }

    if ($post->post_author != $user_id) {
        return new WP_Error('rest_forbidden', 'У вас нет прав для просмотра этого расчета.', array('status' => 403));
    }

    $post_id_to_use = $post->ID;
    $config_json = get_post_meta($post_id_to_use, '_partner_quote_config_json', true);
    $config_data = $config_json ? json_decode($config_json, true) : null;
    $total_cost = get_post_meta($post_id_to_use, '_partner_quote_total_cost', true);
    $quote_type_meta = get_post_meta($post_id_to_use, '_pz_quote_type', true);
    $actual_quote_type = !empty($quote_type_meta) ? $quote_type_meta : 'DC'; // Default for older quotes

    if ($config_data === null && !empty($config_json)) { // Check !empty for $config_json
         error_log("Partner Zone Get Single Quote Error: Failed to decode JSON for quote ID {$post_id_to_use}. JSON: {$config_json}");
    }

    // Construct the quote data to return
    $quote_data_response = array(
        'id' => $post_id_to_use, // Return the CPT ID
        'name' => get_the_title($post_id_to_use),
        'date' => get_the_date('c', $post_id_to_use), // Use ISO 8601
        'total_cost' => $total_cost ? floatval($total_cost) : 0,
        'configData' => $config_data, // This is the crucial part, contains CRAC specific data if type is CRAC
        'quoteType' => $actual_quote_type
    );
    
    // If it's a CRAC quote, the frontend expects selectedModel, etc. at the top level of the response *or* inside configData.
    // Since CRACConfiguratorPage now puts everything into configData when sending, 
    // ViewQuote expects to find selectedModel etc. inside configData if quoteType is CRAC.
    // So, the current structure of $quote_data_response where configData holds everything is fine.

    error_log('Partner Zone Get Single Quote: Preparing to send data for quote ID ' . $post_id_to_use . ' of type ' . $actual_quote_type);
    
    return wp_send_json_success($quote_data_response, 200);
}

// --- Manager Approval Setup (Basic - Requires Manual Admin Action) ---

// Add custom columns to the Users list table in WP Admin
function pz_add_user_list_columns( $columns ) {
    $columns['_pz_email_verified'] = 'Email Verified';
    $columns['_pz_approval_status'] = 'Approval Status';
    return $columns;
}
add_filter( 'manage_users_columns', 'pz_add_user_list_columns' );

// Populate the custom columns
function pz_show_user_list_column_content( $value, $column_name, $user_id ) {
    if ( '_pz_email_verified' == $column_name ) {
        $is_verified = get_user_meta( $user_id, '_pz_email_verified', true );
        return $is_verified ? '<span style="color:green;">Yes</span>' : '<span style="color:red;">No</span>';
    }
    if ( '_pz_approval_status' == $column_name ) {
        $status = get_user_meta( $user_id, '_pz_approval_status', true );
        $status_text = ucfirst( $status ?: 'pending' ); // Default to pending if not set

        switch ( $status ) {
             case 'approved':
                 return '<span style="color:green;">' . $status_text . '</span>';
             case 'rejected':
                 return '<span style="color:red;">' . $status_text . '</span>';
             case 'pending':
             default:
                 return '<span style="color:orange;">' . $status_text . '</span>';
         }
    }
    return $value;
}
add_filter( 'manage_users_custom_column', 'pz_show_user_list_column_content', 10, 3 );


// Add fields to the user profile page in WP Admin
function pz_show_extra_profile_fields( $user ) {
    if ( ! current_user_can( 'edit_users' ) ) { // Only show to users who can edit others
        return;
    }

    $email_verified = get_user_meta( $user->ID, '_pz_email_verified', true );
    $approval_status = get_user_meta( $user->ID, '_pz_approval_status', true ) ?: 'pending'; // Default to pending
    $company = get_user_meta($user->ID, 'company_name', true);
    $phone = get_user_meta($user->ID, 'phone_number', true);

    ?>
    <h3>Partner Zone Information</h3>
    <table class="form-table">
        <tr>
            <th><label>Company Name</label></th>
            <td><input type="text" class="regular-text" value="<?php echo esc_attr($company); ?>" disabled /></td>
        </tr>
         <tr>
            <th><label>Phone Number</label></th>
            <td><input type="text" class="regular-text" value="<?php echo esc_attr($phone); ?>" disabled /></td>
        </tr>
        <tr>
            <th><label>Email Verified</label></th>
            <td><?php echo $email_verified ? '<span style="color:green; font-weight:bold;">Yes</span>' : '<span style="color:red; font-weight:bold;">No</span>'; ?></td>
        </tr>
        <tr>
            <th><label for="_pz_approval_status">Approval Status</label></th>
            <td>
                <select name="_pz_approval_status" id="_pz_approval_status">
                    <option value="pending" <?php selected( $approval_status, 'pending' ); ?>>Pending</option>
                    <option value="approved" <?php selected( $approval_status, 'approved' ); ?>>Approved</option>
                    <option value="rejected" <?php selected( $approval_status, 'rejected' ); ?>>Rejected</option>
                </select>
                <p class="description">Set the approval status for this partner.</p>
            </td>
        </tr>
         <tr>
             <th><label>Default Role</label></th>
             <td>
                 <?php
                 // Suggest setting role only AFTER approval.
                 // This just displays current roles.
                 echo implode(', ', $user->roles);
                 if ( empty($user->roles) && $approval_status == 'pending') {
                     echo ' (No role assigned - pending approval)';
                 }
                 ?>
                 <p class="description">Assign the 'Subscriber' (or custom 'Partner') role once approved.</p>
            </td>
         </tr>
    </table>
    <?php
}
add_action( 'show_user_profile', 'pz_show_extra_profile_fields' ); // For own profile
add_action( 'edit_user_profile', 'pz_show_extra_profile_fields' ); // For editing others

// Save the custom fields when the user profile is updated by an admin
function pz_save_extra_profile_fields( $user_id ) {
    if ( ! current_user_can( 'edit_users' ) ) {
        return; // Only allow users who can edit profiles to save this
    }

    if ( isset( $_POST['_pz_approval_status'] ) ) {
        $new_status = sanitize_text_field( $_POST['_pz_approval_status'] );
        $old_status = get_user_meta( $user_id, '_pz_approval_status', true );

        if ( in_array( $new_status, array( 'pending', 'approved', 'rejected' ) ) ) {
            update_user_meta( $user_id, '_pz_approval_status', $new_status );

             // --- Handle Role Assignment on Approval ---
             if ($new_status === 'approved' && $old_status !== 'approved') {
                 $user = new WP_User( $user_id );
                 // Set the desired role for approved partners.
                 // Change 'subscriber' to your custom role if you have one.
                 $user->set_role( 'subscriber' );

                 // Optional: Send "Account Approved" email notification to user
                 $user_info = get_userdata( $user_id );
                 $login_url = 'https://iteaq.su/login'; // Use the specified login URL

                 $subject = 'Ваша учетная запись на ' . get_bloginfo('name') . ' одобрена!'; // Russian subject
                 $message = "Здравствуйте, " . $user_info->first_name . ",\n\n"; // Russian greeting
                 $message .= "Ваша партнерская учетная запись на " . get_bloginfo('name') . " была одобрена менеджером.\n\n"; // Russian body
                 $message .= "Теперь вы можете войти в систему здесь: " . $login_url . "\n\n"; // Use the correct login URL
                 $message .= "С уважением,\nКоманда " . get_bloginfo('name'); // Russian regards

                 add_filter( 'wp_mail_content_type', function() { return 'text/plain'; } );
                 wp_mail( $user_info->user_email, $subject, $message );
                 remove_filter( 'wp_mail_content_type', function() { return 'text/plain'; } );

             } elseif ($new_status !== 'approved' && $old_status === 'approved') {
                 // Optional: If moving from approved back to pending/rejected, remove the role?
                 // $user = new WP_User( $user_id );
                 // $user->set_role( '' ); // Removes all roles
             }

        }
    }
}
add_action( 'personal_options_update', 'pz_save_extra_profile_fields' ); // For own profile update
add_action( 'edit_user_profile_update', 'pz_save_extra_profile_fields' ); // For updating others

// Email Verification Handler
function pz_handle_email_verification( WP_REST_Request $request ) {
    $token = $request['token'];
    $user_id = $request['user_id'];

    $user = get_userdata( $user_id );
    $frontend_status_url = home_url('/registration-status'); // Base URL for frontend status page

    // 1. Check if user exists
    if ( ! $user ) {
        // Redirect with specific error state
        wp_redirect( add_query_arg( 'state', 'verification_error_user', $frontend_status_url ) ); // Error message handled by frontend page
        exit;
    }

    // 2. Check if already verified
    if ( get_user_meta( $user_id, '_pz_email_verified', true ) ) {
         // Redirect indicating already verified, still pending approval
         wp_redirect( add_query_arg( 'state', 'already_verified', $frontend_status_url ) ); // Message handled by frontend page
         exit;
    }

    // 3. Get stored token and expiry
    $stored_token = get_user_meta( $user_id, '_pz_email_verification_token', true );
    $expiry_time = get_user_meta( $user_id, '_pz_email_token_expires', true );

    // 4. Validate token and expiry
    if ( ! $stored_token || ! hash_equals( $stored_token, $token ) ) { // Use hash_equals for timing attack resistance
         // Redirect with invalid token error
         wp_redirect( add_query_arg( 'state', 'verification_error_token', $frontend_status_url ) );
         exit;
    }

    if ( ! $expiry_time || time() > $expiry_time ) {
        // Redirect with expired token error
        // Optional: Clean up expired token?
        // delete_user_meta($user_id, '_pz_email_verification_token');
        // delete_user_meta($user_id, '_pz_email_token_expires');
        wp_redirect( add_query_arg( 'state', 'verification_error_expired', $frontend_status_url ) );
        exit;
    }

    // --- Verification Successful ---

    // 5. Mark email as verified
    update_user_meta( $user_id, '_pz_email_verified', true );

    // 6. Clean up token and expiry meta
    delete_user_meta( $user_id, '_pz_email_verification_token' );
    delete_user_meta( $user_id, '_pz_email_token_expires' );

    // 7. Notify Manager(s)
    $admin_email = get_option( 'admin_email' ); // Get the site admin email
    $user_info = get_userdata( $user_id );
    $user_edit_link = admin_url( 'user-edit.php?user_id=' . $user_id );

    $manager_subject = 'Новый пользователь Партнерской Зоны требует одобрения: ' . $user_info->user_email; // Russian Subject
    $manager_message = "Новый пользователь зарегистрировался и подтвердил свой email для Партнерской Зоны:\n\n"; // Russian Body
    $manager_message .= "Имя пользователя/Email: " . $user_info->user_email . "\n";
    $manager_message .= "Имя: " . $user_info->first_name . " " . $user_info->last_name . "\n";
    $manager_message .= "Компания: " . get_user_meta($user_id, 'company_name', true) . "\n";
    $manager_message .= "Телефон: " . get_user_meta($user_id, 'phone_number', true) . "\n\n";
    $manager_message .= "Пожалуйста, просмотрите детали и одобрите или отклоните учетную запись здесь:\n"; // Russian Instruction
    $manager_message .= $user_edit_link . "\n\n";

    add_filter( 'wp_mail_content_type', function() { return 'text/plain'; } );
    wp_mail( $admin_email, $manager_subject, $manager_message );
     // Optional: Add more emails here if needed
     // wp_mail( 'another-manager@example.com', $manager_subject, $manager_message );
    remove_filter( 'wp_mail_content_type', function() { return 'text/plain'; } );


    // 8. Redirect to the frontend /email-verified route
    $frontend_verified_url = home_url('/email-verified');
    wp_redirect( $frontend_verified_url );
    exit;
}

// Callback for Example Protected Endpoint
function pz_get_user_data( WP_REST_Request $request ) {
    // The user ID was attached in pz_check_permission 
    // OR could be retrieved via get_current_user_id() if wp_set_current_user was called
    $user_id = get_current_user_id(); 

    if ( ! $user_id ) {
         return new WP_Error( 'rest_not_logged_in', 'Пользователь не авторизован.', array( 'status' => 401 ) ); // Russian
    }

    $user = get_userdata( $user_id );

    if ( ! $user ) {
         // This shouldn't happen if JWT validation worked, but good practice
         return new WP_Error( 'user_not_found', 'Пользователь не найден.', array( 'status' => 404 ) ); // Russian
    }

    // Get the approval status
    $approval_status = get_user_meta( $user->ID, '_pz_approval_status', true ) ?: 'pending';

     // Return specific user data (avoid sending everything)
    return wp_send_json_success( array(
        // Keep the nested 'user' structure consistent with login response
        'user' => array( 
            'id'           => $user->ID,
            'user_email'        => $user->user_email, // Use API consistent key
            'user_display_name' => $user->display_name, // Use API consistent key
            'approval_status'   => $approval_status, // Add status
            // Add first/last name etc. if needed by frontend permanently
            // 'first_name'   => $user->first_name, 
            // 'last_name'    => $user->last_name,
            // 'roles'        => $user->roles, 
            // 'company_name' => get_user_meta($user->ID, 'company_name', true),
            // 'phone_number' => get_user_meta($user->ID, 'phone_number', true),
        )
    ), 200 );
}

/**
 * Handle Send Configuration Email Request (New)
 *
 * @param WP_REST_Request $request
 * @return WP_REST_Response|WP_Error
 */
function pz_handle_send_config_email( WP_REST_Request $request ) {
    $partner_user_id = get_current_user_id();
    if (!$partner_user_id) {
        return new WP_Error('rest_not_logged_in', 'Partner user not authenticated.', array('status' => 401));
    }

    $params = $request->get_json_params();

    // --- Extract Data --- 
    $customerInfo = $params['customerInfo'] ?? null;
    $partnerInfo = $params['partnerInfo'] ?? null;
    $rackConfig = $params['rackConfig'] ?? null;
    $coolingSystem = $params['coolingSystem'] ?? null;
    $itUps = $params['itUps'] ?? null;
    $batteryConfig = $params['batteryConfig'] ?? null;
    $pduConfig = $params['pduConfig'] ?? null;
    $additionalSystems = $params['additionalSystems'] ?? null;
    $totalCost = $params['totalCost'] ?? 0; // Assuming totalCost is sent, default to 0 if not
    $redundancyEnabled = $params['redundancyEnabled'] ?? false; // Extract redundancyEnabled flag
    $costBreakdown = $params['costBreakdown'] ?? []; // Extract cost breakdown

    // --- NEW: Extract commissioning info ---
    $commissioning = $params['commissioning'] ?? null;

    // --- Validate Essential Data --- 
    if (
        !$customerInfo || !isset($customerInfo['name']) || !isset($customerInfo['email']) || !isset($customerInfo['quoteName']) ||
        !$partnerInfo || !isset($partnerInfo['name']) || !isset($partnerInfo['email']) ||
        !$rackConfig // Add checks for essential rack keys if needed
    ) { 
        error_log('Partner Zone Send Email Error: Missing essential nested data (customerInfo[name/email/quoteName], partnerInfo[name/email], or rackConfig). Payload: ' . print_r($params, true));
        return new WP_Error('missing_data', 'Недостаточно данных для отправки конфигурации.', array('status' => 400));
    }

    // --- Construct Email --- 
    $to_email = 'Iteaq@iteaq.su'; 
    $partner_email = $partnerInfo['email']; // Get partner email for potential CC
    $headers = array('Content-Type: text/html; charset=UTF-8');
    // Add CC header if partner email is valid
    if (is_email($partner_email)) {
        $headers[] = 'Cc: ' . $partner_email;
    }
    
    // Use validated keys
    $subject = sprintf('Новая конфигурация ЦОД от %s для %s (Квота: %s)',
        esc_html($partnerInfo['name']), // Use validated key
        esc_html($customerInfo['name']), // Use validated key
        esc_html($customerInfo['quoteName']) // Use validated key
    );

    // Format total cost
    $formattedTotalCost = '$' . number_format($totalCost, 2, '.', ',');

    // Build HTML Email Body (example structure)
    $message = "<html><head><title>Новая конфигурация ЦОД</title></head><body>";
    $message .= "<h1>Новая конфигурация ЦОД: " . esc_html($customerInfo['quoteName']) . "</h1>";
    
    $message .= "<h2>Информация о партнере:</h2>";
    $message .= "<p>Имя: " . esc_html($partnerInfo['name'] ?? 'N/A') . "</p>";
    $message .= "<p>Email: " . esc_html($partnerInfo['email'] ?? 'N/A') . "</p>";

    $message .= "<h2>Информация о заказчике:</h2>";
    $message .= "<p>Название: " . esc_html($customerInfo['name'] ?? 'N/A') . "</p>";
    $message .= "<p>Email: " . esc_html($customerInfo['email'] ?? 'N/A') . "</p>";
    $message .= "<p>Телефон: " . esc_html($customerInfo['phone'] ?? 'N/A') . "</p>";
    $message .= "<p>Название квоты: " . esc_html($customerInfo['quoteName'] ?? 'N/A') . "</p>";

    // Add Configuration Details (Example - expand this significantly)
    $message .= "<h2>Детали конфигурации:</h2>";
    if ($rackConfig) {
        $message .= "<h3>Стойки:</h3>";
        $message .= "<p>600мм: " . esc_html($rackConfig['racks600'] ?? '0') . " шт. @ " . esc_html($rackConfig['power600'] ?? '0') . " кВт</p>";
        $message .= "<p>800мм: " . esc_html($rackConfig['racks800'] ?? '0') . " шт. @ " . esc_html($rackConfig['power800'] ?? '0') . " кВт</p>";
        $message .= "<p>Общая нагрузка: " . esc_html($rackConfig['totalLoad'] ?? '0') . " кВт</p>";
    }
    if ($coolingSystem) {
        $message .= "<h3>Охлаждение:</h3>";
        $message .= "<p>Модель AC: " . esc_html($coolingSystem['acModel'] ?? 'N/A') . " (" . esc_html($coolingSystem['acUnitsCount'] ?? '0') . " шт.)</p>";
        $message .= "<p>Общая мощность AC: " . esc_html($coolingSystem['acTotalPower'] ?? '0') . " кВт</p>";
        $message .= "<p>Резервное питание AC: " . (isset($coolingSystem['backupCooling']) && $coolingSystem['backupCooling'] ? 'Да' : 'Нет') . "</p>";
        if (isset($coolingSystem['backupCooling']) && $coolingSystem['backupCooling'] && isset($coolingSystem['acUpsModel'])) {
            $message .= "<p>ИБП для AC: " . esc_html($coolingSystem['acUpsModel']) . " (" . esc_html($coolingSystem['acUpsPower'] ?? '0') . " кВт)</p>";
        }
    }
    
    // Add IT UPS details with redundancy information
    if ($itUps) {
        $message .= "<h3>ИБП для ИТ-нагрузки:</h3>";
        $upsPriceFormatted = '$' . number_format((float)$itUps['price'], 2, '.', ',');
        
        if ($redundancyEnabled) {
            $message .= "<p>Модель: " . esc_html($itUps['model']) . " - <strong>2N резервирование (2x)</strong></p>";
            $message .= "<p>Мощность: " . esc_html($itUps['power']) . " кВт (каждый)</p>";
            $message .= "<p>Стоимость: " . $upsPriceFormatted . " x 2 = $" . number_format((float)$itUps['price'] * 2, 2, '.', ',') . "</p>";
        } else {
            $message .= "<p>Модель: " . esc_html($itUps['model']) . "</p>";
            $message .= "<p>Мощность: " . esc_html($itUps['power']) . " кВт</p>";
            $message .= "<p>Стоимость: " . $upsPriceFormatted . "</p>";
        }
        
        if (!empty($itUps['description'])) {
            $message .= "<p>Описание: " . esc_html($itUps['description']) . "</p>";
        }
    }
    
    // Add battery config with redundancy consideration
    if ($batteryConfig) {
        $message .= "<h3>Конфигурация батарей:</h3>";
        $batteryPriceFormatted = '$' . number_format((float)$batteryConfig['total_price'], 2, '.', ',');
        
        // Calculate battery count based on redundancy
        $batteryCount = $batteryConfig['total_batteries'];
        $totalBatteryPrice = $batteryConfig['total_price'];
        
        if ($redundancyEnabled) {
            $batteryCount *= 2;
            $totalBatteryPrice *= 2;
        }
        
        $message .= "<p>Модель: " . esc_html($batteryConfig['model']) . "</p>";
        $message .= "<p>Емкость: " . esc_html($batteryConfig['capacity_ah']) . " Ач</p>";
        $message .= "<p>Количество строк: " . esc_html($batteryConfig['strings_needed']) . 
                   ($redundancyEnabled ? " (x2 для 2N)" : "") . "</p>";
        $message .= "<p>Общее количество батарей: " . esc_html($batteryCount) . "</p>";
        $message .= "<p>Общая стоимость батарей: $" . number_format($totalBatteryPrice, 2, '.', ',') . "</p>";
    }
    
    // Add PDU configuration
    if ($pduConfig) {
        $message .= "<h3>Конфигурация PDU:</h3>";
        $message .= "<p>Тип: " . esc_html($pduConfig['typeLabel'] ?? $pduConfig['type']) . "</p>";
        $message .= "<p>Ток: " . esc_html($pduConfig['current']) . " A</p>";
        $message .= "<p>Фаза: " . esc_html($pduConfig['phase']) . "</p>";
        $message .= "<p>Общая стоимость PDU: $" . number_format((float)$pduConfig['totalCost'], 2, '.', ',') . "</p>";
    }
    
    // Add additional systems information
    if ($additionalSystems) {
        $message .= "<h3>Дополнительные системы:</h3>";
        $message .= "<p>Мониторинг: " . (isset($additionalSystems['monitoring']) && $additionalSystems['monitoring'] ? 'Да' : 'Нет') . "</p>";
        $message .= "<p>Изоляция коридоров: " . (isset($additionalSystems['corridorIsolation']) && $additionalSystems['corridorIsolation'] ? 'Да' : 'Нет') . "</p>";
        $message .= "<p>Система распределения: " . (isset($additionalSystems['distributionSystem']) && $additionalSystems['distributionSystem'] ? 'Да' : 'Нет') . "</p>";
        $message .= "<p>ПНР выбрано: " . (isset($additionalSystems['pnrSelected']) && $additionalSystems['pnrSelected'] ? 'Да' : 'Нет') . "</p>";
    }

    // --- NEW: Add commissioning info to email ---
    if ($commissioning && !empty($commissioning['included'])) {
        $commissioningCostFormatted = '$' . number_format((float)$commissioning['cost'], 2, '.', ',');
        $message .= "<h3>Пуско-наладочные работы:</h3>";
        $message .= "<p>Включено</p>";
        $message .= "<p>Описание: " . esc_html($commissioning['description']) . "</p>";
        $message .= "<p>Стоимость ПНР: <strong>" . $commissioningCostFormatted . "</strong></p>";
    } else {
        $message .= "<h3>Пуско-наладочные работы:</h3><p>Не выбрано</p>";
    }

    // Add cost summary with detailed breakdown
    $message .= "<h2>Итоговая стоимость</h2>";
    if (!empty($costBreakdown) && is_array($costBreakdown)) {
        $message .= "<ul>";
        foreach ($costBreakdown as $item) {
            $formattedItemCost = '$' . number_format((float)$item['cost'], 2, '.', ',');
            $message .= "<li>" . esc_html($item['label']) . ": " . $formattedItemCost . "</li>";
        }
        $message .= "</ul>";
    } else if (isset($params['costBreakdown']) && is_array($params['costBreakdown'])) {
        // Fallback to params if needed
        $message .= "<ul>";
        foreach ($params['costBreakdown'] as $item) {
            $formattedItemCost = '$' . number_format((float)$item['cost'], 2, '.', ',');
            $message .= "<li>" . esc_html($item['label']) . ": " . $formattedItemCost . "</li>";
        }
        $message .= "</ul>";
    }
    $message .= "<p><strong>Общая стоимость: " . $formattedTotalCost . "</strong></p>";

    $message .= "</body></html>";

    // --- Send Email --- 
    // Clear PHPMailer errors before calling wp_mail
    global $phpmailer;
    if (!isset($phpmailer) || !is_object($phpmailer)) {
        // Include the PHPMailer class if it's not loaded (might be needed in REST context)
        require_once ABSPATH . WPINC . '/PHPMailer/PHPMailer.php';
        require_once ABSPATH . WPINC . '/PHPMailer/SMTP.php';
        require_once ABSPATH . WPINC . '/PHPMailer/Exception.php';
        $phpmailer = new PHPMailer\PHPMailer\PHPMailer(true);
    }
    $phpmailer->clearAllRecipients();
    $phpmailer->clearAttachments();
    $phpmailer->clearCustomHeaders();
    $phpmailer->clearReplyTos();

    $sent = wp_mail($to_email, $subject, $message, $headers);

    if ($sent) {
        return wp_send_json_success(array('message' => 'Конфигурация успешно отправлена.'), 200);
    } else {
        // Log detailed error from PHPMailer
        $error_message = 'Не удалось отправить письмо с конфигурацией.';
        if (isset($phpmailer) && is_object($phpmailer) && !empty($phpmailer->ErrorInfo)) {
            $error_info = $phpmailer->ErrorInfo; // Store error info
            $error_message .= ' Ошибка PHPMailer: ' . $error_info;
            error_log('Partner Zone Send Email Error: wp_mail failed. PHPMailer ErrorInfo: ' . $error_info . ' | To: ' . $to_email . ' | Subject: ' . $subject);
        } else {
            // Log a generic error if PHPMailer info isn't available
             error_log('Partner Zone Send Email Error: wp_mail failed. No specific PHPMailer error info available. Check WordPress/server mail configuration. To: ' . $to_email . ' | Subject: ' . $subject);
        }
        return new WP_Error('send_failed', $error_message, array('status' => 500));
    }
}

?>
