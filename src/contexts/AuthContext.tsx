import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';

// Define the shape of the user object received from the API login endpoint
interface UserDataFromApi {
    id: number;
    user_email: string;
    user_display_name: string;
    user_nicename?: string; // Optional field from API
    approval_status: string; // Add approval status
}

// Define the shape of the user object we store in context/localStorage
interface User {
    id: number;
    email: string;
    displayName: string; // Use this consistently in the frontend
    approvalStatus: string; // Add approval status
}

// Define the shape of the context value
interface AuthContextType {
    isAuthenticated: boolean;
    user: User | null; // Use the internal User type
    token: string | null;
    login: (token: string, userDataFromApi: UserDataFromApi) => void; // Accept API structure
    logout: () => void;
    isLoading: boolean; // To track initial loading state
    // approvalStatus: string | null; // Expose status directly if needed, or via user object
}

// Create the context with a default value
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Define the props for the provider component
interface AuthProviderProps {
    children: ReactNode;
}

// Create the provider component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true); // Start loading

    // Effect to check for existing token AND fetch fresh user data on initial load
    useEffect(() => {
        const storedToken = localStorage.getItem('authToken');

        const validateTokenAndFetchUser = async (currentToken: string) => {
            try {
                const response = await fetch('/wp-json/partner-zone/v1/user-data', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${currentToken}`,
                    },
                });

                const responseData = await response.json();

                if (!response.ok) {
                    // Token is invalid or other server error
                    throw new Error(responseData.message || 'Failed to validate session');
                }

                if (responseData.success && responseData.data.user) {
                    // Token is valid, use fresh user data
                    const userDataFromApi: UserDataFromApi = responseData.data.user;
                    
                    // Map API data to the internal User structure
                    const internalUser: User = {
                        id: userDataFromApi.id,
                        email: userDataFromApi.user_email,
                        displayName: userDataFromApi.user_display_name,
                        approvalStatus: userDataFromApi.approval_status,
                    };

                    setToken(currentToken);
                    setUser(internalUser);
                    setIsAuthenticated(true);
                    // Update localStorage with fresh data
                    localStorage.setItem('authUser', JSON.stringify(internalUser));
                } else {
                    // Valid response, but unexpected data format
                     throw new Error('Invalid user data format received.');
                }

            } catch (error) {
                console.error("Error validating token or fetching user data:", error);
                // Clear invalid/old token and user data
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                setToken(null);
                setUser(null);
                setIsAuthenticated(false);
            }
        };

        if (storedToken) {
            validateTokenAndFetchUser(storedToken).finally(() => {
                setIsLoading(false); // Finished loading/validation attempt
            });
        } else {
            setIsLoading(false); // No token found, finished loading
        }
    }, []); // Run only on initial mount

    // Updated Login function: accepts API structure, stores internal structure
    const login = (newToken: string, userDataFromApi: UserDataFromApi) => {
        // Map API data to the internal User structure
        const internalUser: User = {
            id: userDataFromApi.id,
            email: userDataFromApi.user_email,
            displayName: userDataFromApi.user_display_name,
            approvalStatus: userDataFromApi.approval_status,
        };
        
        localStorage.setItem('authToken', newToken);
        localStorage.setItem('authUser', JSON.stringify(internalUser)); // Store mapped user
        setToken(newToken);
        setUser(internalUser); // Set state with mapped user
        setIsAuthenticated(true);
    };

    // Logout function: clears storage and state
    const logout = () => {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
    };

    // Value provided by the context
    const value = {
        isAuthenticated,
        user, // User object now contains approvalStatus
        token,
        login,
        logout,
        isLoading,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use the AuthContext
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 