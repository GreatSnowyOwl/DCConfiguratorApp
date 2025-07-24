{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import React, \{ useState, useEffect, useRef \} from 'react';\
import \{ jsPDF \} from 'jspdf';\
import \{ PDFDocument \} from 'pdf-lib';\
import \{ Button \} from '@/components/ui/button';\
import \{ Input \} from '@/components/ui/input';\
import \{ Label \} from '@/components/ui/label';\
import \{ motion \} from 'framer-motion';\
import \{ useAuth \} from '../contexts/AuthContext'; // Adjust path if needed\
import \{ useNavigate \} from 'react-router-dom';\
\
// Import background image\
import backgroundImage from '/DATACENTER.png';\
// Import logo image - REMOVED, will reference directly from /public\
// import logoImage from '/logo.png24';\
\
type BatteryType = 'B' | 'M' | 'S';\
\
// Add translations at the top of the file\
const translations = \{\
  title: '\uc0\u1050 \u1086 \u1085 \u1092 \u1080 \u1075 \u1091 \u1088 \u1072 \u1090 \u1086 \u1088  \u1062 \u1054 \u1044 ',\
  steps: \{\
    customerQuoteInfo: '\uc0\u1048 \u1085 \u1092 \u1086 \u1088 \u1084 \u1072 \u1094 \u1080 \u1103  \u1086  \u1079 \u1072 \u1082 \u1072 \u1079 \u1095 \u1080 \u1082 \u1077  \u1080  \u1082 \u1074 \u1086 \u1090 \u1077 ',\
    racks: '\uc0\u1050 \u1086 \u1083 \u1080 \u1095 \u1077 \u1089 \u1090 \u1074 \u1086  \u1089 \u1090 \u1086 \u1077 \u1082 ',\
    power: '\uc0\u1053 \u1072 \u1075 \u1088 \u1091 \u1079 \u1082 \u1072  \u1085 \u1072  \u1089 \u1090 \u1086 \u1081 \u1082 \u1091 ',\
    cooling: '\uc0\u1057 \u1080 \u1089 \u1090 \u1077 \u1084 \u1072  \u1086 \u1093 \u1083 \u1072 \u1078 \u1076 \u1077 \u1085 \u1080 \u1103 ',\
    ups: '\uc0\u1048 \u1089 \u1090 \u1086 \u1095 \u1085 \u1080 \u1082 \u1080  \u1073 \u1077 \u1089 \u1087 \u1077 \u1088 \u1077 \u1073 \u1086 \u1081 \u1085 \u1086 \u1075 \u1086  \u1087 \u1080 \u1090 \u1072 \u1085 \u1080 \u1103 ',\
    battery: '\uc0\u1050 \u1086 \u1085 \u1092 \u1080 \u1075 \u1091 \u1088 \u1072 \u1094 \u1080 \u1103  \u1073 \u1072 \u1090 \u1072 \u1088 \u1077 \u1081 ',\
    pdu: '\uc0\u1056 \u1072 \u1089 \u1087 \u1088 \u1077 \u1076 \u1077 \u1083 \u1077 \u1085 \u1080 \u1077  \u1087 \u1080 \u1090 \u1072 \u1085 \u1080 \u1103 ',\
    monitoring: '\uc0\u1044 \u1086 \u1087 \u1086 \u1083 \u1085 \u1080 \u1090 \u1077 \u1083 \u1100 \u1085 \u1099 \u1077  \u1089 \u1080 \u1089 \u1090 \u1077 \u1084 \u1099 ',\
    summary: '\uc0\u1048 \u1090 \u1086 \u1075 \u1086 \u1074 \u1072 \u1103  \u1082 \u1086 \u1085 \u1092 \u1080 \u1075 \u1091 \u1088 \u1072 \u1094 \u1080 \u1103 ',\
    distributionSystem: '\uc0\u1057 \u1080 \u1089 \u1090 \u1077 \u1084 \u1072  \u1088 \u1072 \u1089 \u1087 \u1088 \u1077 \u1076 \u1077 \u1083 \u1077 \u1085 \u1080 \u1103 ',\
    costSummary: '\uc0\u1048 \u1090 \u1086 \u1075 \u1086 \u1074 \u1072 \u1103  \u1089 \u1090 \u1086 \u1080 \u1084 \u1086 \u1089 \u1090 \u1100 ',\
    additionalSystems: '\uc0\u1044 \u1086 \u1087 \u1086 \u1083 \u1085 \u1080 \u1090 \u1077 \u1083 \u1100 \u1085 \u1099 \u1077  \u1086 \u1087 \u1094 \u1080 \u1080 '\
  \},\
  fields: \{\
    customerName: '\uc0\u1053 \u1072 \u1079 \u1074 \u1072 \u1085 \u1080 \u1077  \u1079 \u1072 \u1082 \u1072 \u1079 \u1095 \u1080 \u1082 \u1072 ',\
    customerPhone: '\uc0\u1053 \u1086 \u1084 \u1077 \u1088  \u1090 \u1077 \u1083 \u1077 \u1092 \u1086 \u1085 \u1072  \u1079 \u1072 \u1082 \u1072 \u1079 \u1095 \u1080 \u1082 \u1072 ',\
    customerEmail: 'Email \uc0\u1079 \u1072 \u1082 \u1072 \u1079 \u1095 \u1080 \u1082 \u1072 ',\
    quoteName: '\uc0\u1053 \u1072 \u1079 \u1074 \u1072 \u1085 \u1080 \u1077  \u1082 \u1074 \u1086 \u1090 \u1099 ',\
    racks600: '\uc0\u1057 \u1090 \u1086 \u1081 \u1082 \u1080  600\u1084 \u1084 ',\
    racks800: '\uc0\u1057 \u1090 \u1086 \u1081 \u1082 \u1080  800\u1084 \u1084 ',\
    power600: '\uc0\u1052 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100  \u1085 \u1072  \u1089 \u1090 \u1086 \u1081 \u1082 \u1091  600\u1084 \u1084  (\u1082 \u1042 \u1090 )',\
    power800: '\uc0\u1052 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100  \u1085 \u1072  \u1089 \u1090 \u1086 \u1081 \u1082 \u1091  800\u1084 \u1084  (\u1082 \u1042 \u1090 )',\
    totalLoad: '\uc0\u1054 \u1073 \u1097 \u1072 \u1103  \u1048 \u1058  \u1085 \u1072 \u1075 \u1088 \u1091 \u1079 \u1082 \u1072 ',\
    backupCooling: '\uc0\u1056 \u1077 \u1079 \u1077 \u1088 \u1074 \u1085 \u1086 \u1077  \u1087 \u1080 \u1090 \u1072 \u1085 \u1080 \u1077  \u1076 \u1083 \u1103  \u1089 \u1080 \u1089 \u1090 \u1077 \u1084 \u1099  \u1086 \u1093 \u1083 \u1072 \u1078 \u1076 \u1077 \u1085 \u1080 \u1103 ',\
    acModel: '\uc0\u1052 \u1086 \u1076 \u1077 \u1083 \u1100  \u1082 \u1086 \u1085 \u1076 \u1080 \u1094 \u1080 \u1086 \u1085 \u1077 \u1088 \u1072 ',\
    batteryTime: '\uc0\u1058 \u1088 \u1077 \u1073 \u1091 \u1077 \u1084 \u1086 \u1077  \u1074 \u1088 \u1077 \u1084 \u1103  \u1072 \u1074 \u1090 \u1086 \u1085 \u1086 \u1084 \u1085 \u1086 \u1081  \u1088 \u1072 \u1073 \u1086 \u1090 \u1099  (\u1074  \u1084 \u1080 \u1085 \u1091 \u1090 \u1072 \u1093 )',\
    pduCurrent: '\uc0\u1053 \u1086 \u1084 \u1080 \u1085 \u1072 \u1083 \u1100 \u1085 \u1099 \u1081  \u1090 \u1086 \u1082 ',\
    pduPhase: '\uc0\u1050 \u1086 \u1083 \u1080 \u1095 \u1077 \u1089 \u1090 \u1074 \u1086  \u1092 \u1072 \u1079 ',\
    pduType: '\uc0\u1058 \u1080 \u1087  PDU',\
    monitoringSystem: '\uc0\u1057 \u1080 \u1089 \u1090 \u1077 \u1084 \u1072  \u1084 \u1086 \u1085 \u1080 \u1090 \u1086 \u1088 \u1080 \u1085 \u1075 \u1072 ',\
    corridorIsolation: '\uc0\u1048 \u1079 \u1086 \u1083 \u1103 \u1094 \u1080 \u1103  \u1082 \u1086 \u1088 \u1080 \u1076 \u1086 \u1088 \u1086 \u1074 ',\
    currentRating: '\uc0\u1053 \u1086 \u1084 \u1080 \u1085 \u1072 \u1083 \u1100 \u1085 \u1099 \u1081  \u1090 \u1086 \u1082 ',\
    phaseConfiguration: '\uc0\u1050 \u1086 \u1085 \u1092 \u1080 \u1075 \u1091 \u1088 \u1072 \u1094 \u1080 \u1103  \u1092 \u1072 \u1079 ',\
    selectedPduConfiguration: '\uc0\u1042 \u1099 \u1073 \u1088 \u1072 \u1085 \u1085 \u1072 \u1103  \u1082 \u1086 \u1085 \u1092 \u1080 \u1075 \u1091 \u1088 \u1072 \u1094 \u1080 \u1103  PDU',\
    addDistributionSystem: '\uc0\u1044 \u1086 \u1073 \u1072 \u1074 \u1080 \u1090 \u1100  \u1089 \u1080 \u1089 \u1090 \u1077 \u1084 \u1091  \u1088 \u1072 \u1089 \u1087 \u1088 \u1077 \u1076 \u1077 \u1083 \u1077 \u1085 \u1080 \u1103 ?',\
    company: '\uc0\u1050 \u1086 \u1084 \u1087 \u1072 \u1085 \u1080 \u1103 ',\
    contact: '\uc0\u1050 \u1086 \u1085 \u1090 \u1072 \u1082 \u1090 ',\
    email: 'Email',\
    phone: '\uc0\u1058 \u1077 \u1083 \u1077 \u1092 \u1086 \u1085 ',\
    racks: '\uc0\u1057 \u1090 \u1086 \u1081 \u1082 \u1080 ',\
    each: '\uc0\u1082 \u1072 \u1078 \u1076 \u1072 \u1103 ',\
    acUnits: '\uc0\u1050 \u1086 \u1085 \u1076 \u1080 \u1094 \u1080 \u1086 \u1085 \u1077 \u1088 \u1099  (N+1)',\
    totalPower: '\uc0\u1054 \u1073 \u1097 \u1072 \u1103  \u1084 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100 ',\
    backupPower: '\uc0\u1056 \u1077 \u1079 \u1077 \u1088 \u1074 \u1085 \u1086 \u1077  \u1087 \u1080 \u1090 \u1072 \u1085 \u1080 \u1077 ',\
    current: '\uc0\u1058 \u1086 \u1082 ',\
    phase: '\uc0\u1060 \u1072 \u1079 \u1099 ',\
    type: '\uc0\u1058 \u1080 \u1087 ',\
    model: '\uc0\u1052 \u1086 \u1076 \u1077 \u1083 \u1100 ',\
    capacity: '\uc0\u1045 \u1084 \u1082 \u1086 \u1089 \u1090 \u1100 ',\
    totalBatteries: '\uc0\u1042 \u1089 \u1077 \u1075 \u1086  \u1073 \u1072 \u1090 \u1072 \u1088 \u1077 \u1081 ',\
    totalWeight: '\uc0\u1054 \u1073 \u1097 \u1080 \u1081  \u1074 \u1077 \u1089 ',\
    included: '\uc0\u1042 \u1082 \u1083 \u1102 \u1095 \u1077 \u1085 \u1086 ',\
    yes: '\uc0\u1044 \u1072 ',\
    no: '\uc0\u1053 \u1077 \u1090 ',\
    single: '\uc0\u1054 \u1076 \u1085 \u1072 ',\
    three: '\uc0\u1058 \u1088 \u1080 ',\
    powerRating: '\uc0\u1052 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100 ',\
    wCell: '\uc0\u1042 \u1090 /\u1069 \u1083 \u1077 \u1084 \u1077 \u1085 \u1090 ',\
    banks: '\uc0\u1041 \u1072 \u1085 \u1082 \u1080 ',\
    dimensions: '\uc0\u1056 \u1072 \u1079 \u1084 \u1077 \u1088 \u1099 ',\
    totalCost: '\uc0\u1054 \u1073 \u1097 \u1072 \u1103  \u1089 \u1090 \u1086 \u1080 \u1084 \u1086 \u1089 \u1090 \u1100 '\
  \},\
  buttons: \{\
    back: '\uc0\u1053 \u1072 \u1079 \u1072 \u1076 ',\
    next: '\uc0\u1044 \u1072 \u1083 \u1077 \u1077 ',\
    generateReport: '\uc0\u1057 \u1092 \u1086 \u1088 \u1084 \u1080 \u1088 \u1086 \u1074 \u1072 \u1090 \u1100  \u1086 \u1090 \u1095 \u1077 \u1090 ',\
    downloadPdf: '\uc0\u1057 \u1082 \u1072 \u1095 \u1072 \u1090 \u1100  PDF',\
    sendEmail: '\uc0\u1054 \u1090 \u1087 \u1088 \u1072 \u1074 \u1080 \u1090 \u1100  \u1085 \u1072  \u1087 \u1086 \u1095 \u1090 \u1091 '\
  \},\
  validation: \{\
    required: '\uc0\u1054 \u1073 \u1103 \u1079 \u1072 \u1090 \u1077 \u1083 \u1100 \u1085 \u1086 \u1077  \u1087 \u1086 \u1083 \u1077 ',\
    enterCustomerName: '\uc0\u1042 \u1074 \u1077 \u1076 \u1080 \u1090 \u1077  \u1085 \u1072 \u1079 \u1074 \u1072 \u1085 \u1080 \u1077  \u1079 \u1072 \u1082 \u1072 \u1079 \u1095 \u1080 \u1082 \u1072 ',\
    enterCustomerPhone: '\uc0\u1042 \u1074 \u1077 \u1076 \u1080 \u1090 \u1077  \u1090 \u1077 \u1083 \u1077 \u1092 \u1086 \u1085  \u1079 \u1072 \u1082 \u1072 \u1079 \u1095 \u1080 \u1082 \u1072 ',\
    invalidCustomerPhone: '\uc0\u1042 \u1074 \u1077 \u1076 \u1080 \u1090 \u1077  \u1082 \u1086 \u1088 \u1088 \u1077 \u1082 \u1090 \u1085 \u1099 \u1081  \u1085 \u1086 \u1084 \u1077 \u1088  \u1090 \u1077 \u1083 \u1077 \u1092 \u1086 \u1085 \u1072  \u1079 \u1072 \u1082 \u1072 \u1079 \u1095 \u1080 \u1082 \u1072 ',\
    enterQuoteName: '\uc0\u1042 \u1074 \u1077 \u1076 \u1080 \u1090 \u1077  \u1085 \u1072 \u1079 \u1074 \u1072 \u1085 \u1080 \u1077  \u1082 \u1074 \u1086 \u1090 \u1099 ',\
    enterRacks: '\uc0\u1042 \u1074 \u1077 \u1076 \u1080 \u1090 \u1077  \u1082 \u1086 \u1083 \u1080 \u1095 \u1077 \u1089 \u1090 \u1074 \u1086  \u1089 \u1090 \u1086 \u1077 \u1082 ',\
    enterPower: '\uc0\u1042 \u1074 \u1077 \u1076 \u1080 \u1090 \u1077  \u1084 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100  \u1093 \u1086 \u1090 \u1103  \u1073 \u1099  \u1076 \u1083 \u1103  \u1086 \u1076 \u1085 \u1086 \u1075 \u1086  \u1090 \u1080 \u1087 \u1072  \u1089 \u1090 \u1086 \u1077 \u1082 ',\
    selectAcModel: '\uc0\u1042 \u1099 \u1073 \u1077 \u1088 \u1080 \u1090 \u1077  \u1084 \u1086 \u1076 \u1077 \u1083 \u1100  \u1082 \u1086 \u1085 \u1076 \u1080 \u1094 \u1080 \u1086 \u1085 \u1077 \u1088 \u1072 ',\
    enterBackupTime: '\uc0\u1042 \u1074 \u1077 \u1076 \u1080 \u1090 \u1077  \u1074 \u1088 \u1077 \u1084 \u1103  \u1072 \u1074 \u1090 \u1086 \u1085 \u1086 \u1084 \u1085 \u1086 \u1081  \u1088 \u1072 \u1073 \u1086 \u1090 \u1099 ',\
    selectPduCurrent: '\uc0\u1042 \u1099 \u1073 \u1077 \u1088 \u1080 \u1090 \u1077  \u1085 \u1086 \u1084 \u1080 \u1085 \u1072 \u1083 \u1100 \u1085 \u1099 \u1081  \u1090 \u1086 \u1082 ',\
    selectPduPhase: '\uc0\u1042 \u1099 \u1073 \u1077 \u1088 \u1080 \u1090 \u1077  \u1082 \u1086 \u1083 \u1080 \u1095 \u1077 \u1089 \u1090 \u1074 \u1086  \u1092 \u1072 \u1079 ',\
    selectPduType: '\uc0\u1042 \u1099 \u1073 \u1077 \u1088 \u1080 \u1090 \u1077  \u1090 \u1080 \u1087  PDU',\
    enterCustomerEmail: '\uc0\u1042 \u1074 \u1077 \u1076 \u1080 \u1090 \u1077  Email \u1079 \u1072 \u1082 \u1072 \u1079 \u1095 \u1080 \u1082 \u1072 ',\
    invalidCustomerEmail: '\uc0\u1042 \u1074 \u1077 \u1076 \u1080 \u1090 \u1077  \u1082 \u1086 \u1088 \u1088 \u1077 \u1082 \u1090 \u1085 \u1099 \u1081  Email \u1079 \u1072 \u1082 \u1072 \u1079 \u1095 \u1080 \u1082 \u1072 '\
  \},\
  pduTypes: \{\
    'B': '\uc0\u1041 \u1072 \u1079 \u1086 \u1074 \u1099 \u1081 ',\
    'M': '\uc0\u1052 \u1086 \u1085 \u1080 \u1090 \u1086 \u1088 \u1080 \u1085 \u1075 ',\
    'S': '\uc0\u1059 \u1087 \u1088 \u1072 \u1074 \u1083 \u1103 \u1077 \u1084 \u1099 \u1081 '\
  \} as const,\
  summary: \{\
    companyInfo: '\uc0\u1048 \u1085 \u1092 \u1086 \u1088 \u1084 \u1072 \u1094 \u1080 \u1103  \u1086  \u1082 \u1086 \u1084 \u1087 \u1072 \u1085 \u1080 \u1080 ',\
    rackConfig: '\uc0\u1050 \u1086 \u1085 \u1092 \u1080 \u1075 \u1091 \u1088 \u1072 \u1094 \u1080 \u1103  \u1089 \u1090 \u1086 \u1077 \u1082 ',\
    cooling: '\uc0\u1057 \u1080 \u1089 \u1090 \u1077 \u1084 \u1072  \u1086 \u1093 \u1083 \u1072 \u1078 \u1076 \u1077 \u1085 \u1080 \u1103 ',\
    pduConfig: '\uc0\u1050 \u1086 \u1085 \u1092 \u1080 \u1075 \u1091 \u1088 \u1072 \u1094 \u1080 \u1103  PDU',\
    batteryConfig: '\uc0\u1050 \u1086 \u1085 \u1092 \u1080 \u1075 \u1091 \u1088 \u1072 \u1094 \u1080 \u1103  \u1073 \u1072 \u1090 \u1072 \u1088 \u1077 \u1081 ',\
    additionalSystems: '\uc0\u1044 \u1086 \u1087 \u1086 \u1083 \u1085 \u1080 \u1090 \u1077 \u1083 \u1100 \u1085 \u1099 \u1077  \u1089 \u1080 \u1089 \u1090 \u1077 \u1084 \u1099 ',\
    costSummary: '\uc0\u1048 \u1090 \u1086 \u1075 \u1086 \u1074 \u1072 \u1103  \u1089 \u1090 \u1086 \u1080 \u1084 \u1086 \u1089 \u1090 \u1100 ',\
    totalCost: '\uc0\u1054 \u1073 \u1097 \u1072 \u1103  \u1089 \u1090 \u1086 \u1080 \u1084 \u1086 \u1089 \u1090 \u1100 ',\
    company: '\uc0\u1050 \u1086 \u1084 \u1087 \u1072 \u1085 \u1080 \u1103 ',\
    contact: '\uc0\u1050 \u1086 \u1085 \u1090 \u1072 \u1082 \u1090 ',\
    email: 'Email',\
    phone: '\uc0\u1058 \u1077 \u1083 \u1077 \u1092 \u1086 \u1085 ',\
    racks: '\uc0\u1057 \u1090 \u1086 \u1081 \u1082 \u1080 ',\
    each: '\uc0\u1082 \u1072 \u1078 \u1076 \u1072 \u1103 ',\
    acUnits: '\uc0\u1050 \u1086 \u1085 \u1076 \u1080 \u1094 \u1080 \u1086 \u1085 \u1077 \u1088 \u1099  (N+1)',\
    totalPower: '\uc0\u1054 \u1073 \u1097 \u1072 \u1103  \u1084 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100 ',\
    backupPower: '\uc0\u1056 \u1077 \u1079 \u1077 \u1088 \u1074 \u1085 \u1086 \u1077  \u1087 \u1080 \u1090 \u1072 \u1085 \u1080 \u1077 ',\
    current: '\uc0\u1058 \u1086 \u1082 ',\
    phase: '\uc0\u1060 \u1072 \u1079 \u1099 ',\
    type: '\uc0\u1058 \u1080 \u1087 ',\
    model: '\uc0\u1052 \u1086 \u1076 \u1077 \u1083 \u1100 ',\
    capacity: '\uc0\u1045 \u1084 \u1082 \u1086 \u1089 \u1090 \u1100 ',\
    totalBatteries: '\uc0\u1042 \u1089 \u1077 \u1075 \u1086  \u1073 \u1072 \u1090 \u1072 \u1088 \u1077 \u1081 ',\
    totalWeight: '\uc0\u1054 \u1073 \u1097 \u1080 \u1081  \u1074 \u1077 \u1089 ',\
    included: '\uc0\u1042 \u1082 \u1083 \u1102 \u1095 \u1077 \u1085 \u1086 ',\
    yes: '\uc0\u1044 \u1072 ',\
    no: '\uc0\u1053 \u1077 \u1090 ',\
    single: '\uc0\u1054 \u1076 \u1085 \u1072 ',\
    three: '\uc0\u1058 \u1088 \u1080 '\
  \},\
  acModels: \{\
    select: '\uc0\u1042 \u1099 \u1073 \u1077 \u1088 \u1080 \u1090 \u1077  \u1084 \u1086 \u1076 \u1077 \u1083 \u1100 ',\
    '12.5': '12.5 \uc0\u1082 \u1042 \u1090  (300 \u1084 \u1084 )',\
    '25': '25 \uc0\u1082 \u1042 \u1090  (300 \u1084 \u1084 )',\
    '35-300': '35 \uc0\u1082 \u1042 \u1090  (300 \u1084 \u1084 )',\
    '35-600': '35 \uc0\u1082 \u1042 \u1090  (600 \u1084 \u1084 )',\
    '45': '45 \uc0\u1082 \u1042 \u1090  (600 \u1084 \u1084 )',\
    '60': '60 \uc0\u1082 \u1042 \u1090  (600 \u1084 \u1084 )',\
    '70': '70 \uc0\u1082 \u1042 \u1090  (600 \u1084 \u1084 )'\
  \},\
  batteryTypes: \{\
    'B': '\uc0\u1041 \u1086 \u1083 \u1100 \u1096 \u1086 \u1081 ',\
    'M': '\uc0\u1057 \u1088 \u1077 \u1076 \u1085 \u1080 \u1081 ',\
    'S': '\uc0\u1052 \u1072 \u1083 \u1099 \u1081 '\
  \} as const\
\};\
\
type PDUType = keyof typeof translations.pduTypes;\
\
// Rename price data constants for simple obfuscation\
const _dataUpsAc = [\
  \{ model: 'UE-0100TPL', power: 10, price: 1805 \}, // Updated price\
  \{ model: 'UE-0150TPL', power: 15, price: 2970 \}, // Updated price\
  \{ model: 'UE-0200TPL', power: 20, price: 3182.50 \}, // Updated price\
  \{ model: 'UE-0300TPL', power: 30, price: 3986 \}, // Updated price\
  \{ model: 'UE-0400TPL', power: 40, price: 4607.69 \}, // Updated price\
  \{ model: 'UE-0600TPL', power: 60, price: 4907.65 \}, // Updated price\
  \{ model: 'UE-0800TPL', power: 80, price: 6490 \}, // Updated price\
  \{ model: 'UE-1000TPL', power: 100, price: 8909.56 \}, // Updated price\
  \{ model: 'UE-1200TPL', power: 120, price: 13469.07 \}, // Updated price\
  \{ model: 'UE-2000TAL', power: 200, price: 23456.92 \}, // Updated price\
  \{ model: 'UE-3000TAL', power: 300, price: 41390.90 \}, // Updated price\
  \{ model: 'UE-4000TAL', power: 400, price: 59465.82 \}, // Updated price\
  \{ model: 'UE-5000TAL', power: 500, price: 69546.80 \}, // Updated price\
  \{ model: 'UE-6000TAL', power: 600, price: 87909.99 \}, // Updated price\
  \{ model: 'UE-8000TAL', power: 800, price: 103456.78 \} // Updated price\
];\
const _dataUpsIt = [\
  \{ model: 'UM-0900TELFS/15', power: 90, description: '\uc0\u1052 \u1086 \u1076 \u1091 \u1083 \u1100 \u1085 \u1099 \u1081  \u1096 \u1082 \u1072 \u1092  \u1048 \u1041 \u1055  90 \u1082 \u1042 \u1040  (5+1, \u1084 \u1072 \u1082 \u1089 \u1080 \u1084 \u1072 \u1083 \u1100 \u1085 \u1072 \u1103  \u1084 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100  90 \u1082 \u1042 \u1040 )', price: 24570.78 \}, // Updated price\
  \{ model: 'UM-1200TFL-FF', power: 120, description: '100kVA Modular UPS cabinet (5+1, Maximum 120kVA)', price: 28246.56 \}, // Updated price\
  \{ model: 'UM-1250TFL-FF', power: 150, description: '125kVA Modular UPS cabinet (5+1, Maximum 150kVA)', price: 28383.26 \}, // Updated price\
  \{ model: 'UM-1800TFL-FS', power: 180, description: '150kVA Modular UPS cabinet (5+1, Maximum 180kVA)', price: 34905.31 \}, // Updated price\
  \{ model: 'UM-2000TAL-FS', power: 200, description: '200kVA Modular UPS cabinet (Maximum 4*50=200kVA)', price: 31651.15 \}, // Updated price\
  \{ model: 'UM-3000TAL-FS', power: 300, description: '300kVA Modular UPS cabinet (Maximum 6*50=300kVA)', price: 46481.76 \}, // Updated price\
  \{ model: 'UM-4000TAL-FF', power: 400, description: '400kVA Modular UPS cabinet (Maximum 8*50=400kVA)', price: 61571.95 \}, // Updated price\
  \{ model: 'UM-5000TAL-FF', power: 500, description: '500kVA Modular UPS cabinet (Maximum 10*50=500kVA)', price: 74388.29 \}, // Updated price\
  \{ model: 'UM-6000TAL-FF', power: 600, description: '600kVA Modular UPS cabinet (Maximum 12*50=600kVA)', price: 90685.30 \}, // Updated price\
  \{ model: 'UM-8000TAL-FF', power: 800, description: '800kVA Modular UPS cabinet (Maximum 16*50=800kVA)', price: 127735.30 \}, // Updated price\
  \{ model: 'UM-0500TFL-M', power: 50, description: '50kVA UPS power module', price: 5541.12 \} // Updated price\
];\
const _dataAc = [\
  \{ model: 'CR012EA / ACS16-A', power: 12.5, dimensions: '300*1200*2000', price: 11355 \}, // Updated price\
  \{ model: 'CR025EA / ACS50-A', power: 25, dimensions: '300*1200*2000', price: 17890 \}, // Updated price\
  \{ model: 'CR035EA-B / ACS60-A', power: 35, dimensions: '300*1200*2000', price: 20300 \}, // Updated price\
  \{ model: 'CR035EA / ACS80-A', power: 40, dimensions: '600*1200*2000', price: 22365 \}, // Updated price\
  \{ model: 'CR045EA / ACS86-A', power: 48, dimensions: '600*1200*2000', price: 26345 \}, // Updated price\
  \{ model: 'CR060EA / ACS99-A', power: 60, dimensions: '600*1200*2000', price: 30580 \}, // Updated price\
  \{ model: 'CR070EA / ACS99-A', power: 70, dimensions: '600*1200*2000', price: 34120 \} // Updated price\
];\
const _dataPdu = \{\
  'B': \{ '16': 120.89, '32': 150.66 \}, // Updated prices\
  'M': \{ '16': 482.37, '32': 697.88 \}, // Updated prices\
  'S': \{ '16': 1482.14, '32': 1882.14 \} // Updated prices\
\};\
const _dataMon = \{\
  price: 6352, // Updated price\
  features: [\
    "4 NVR (DS-7604N-E1/4P-V3), \uc0\u1089 \u1077 \u1090 \u1077 \u1074 \u1086 \u1081  \u1082 \u1086 \u1084 \u1084 \u1091 \u1090 \u1072 \u1090 \u1086 \u1088  8 \u1087 \u1086 \u1088 \u1090 \u1086 \u1074 ", // Translated\
    "\uc0\u1050 \u1086 \u1084 \u1084 \u1091 \u1090 \u1072 \u1090 \u1086 \u1088  8 \u1087 \u1086 \u1088 \u1090 \u1086 \u1074 ", // Translated\
    "\uc0\u1047 \u1074 \u1091 \u1082 \u1086 \u1074 \u1072 \u1103  \u1080  \u1089 \u1074 \u1077 \u1090 \u1086 \u1074 \u1072 \u1103  \u1089 \u1080 \u1075 \u1085 \u1072 \u1083 \u1080 \u1079 \u1072 \u1094 \u1080 \u1103 ", // Translated\
    "\uc0\u1044 \u1072 \u1090 \u1095 \u1080 \u1082  \u1076 \u1099 \u1084 \u1072  \u1089  \u1087 \u1086 \u1076 \u1082 \u1083 \u1102 \u1095 \u1077 \u1085 \u1080 \u1077 \u1084  \u1082  \u1089 \u1080 \u1089 \u1090 \u1077 \u1084 \u1077  \u1087 \u1086 \u1078 \u1072 \u1088 \u1086 \u1090 \u1091 \u1096 \u1077 \u1085 \u1080 \u1103 ", // Translated\
    "\uc0\u1044 \u1072 \u1090 \u1095 \u1080 \u1082  \u1090 \u1077 \u1084 \u1087 \u1077 \u1088 \u1072 \u1090 \u1091 \u1088 \u1099  \u1080  \u1074 \u1083 \u1072 \u1078 \u1085 \u1086 \u1089 \u1090 \u1080  (LCD, RS485)", // Translated\
    "\uc0\u1055 \u1086 \u1083 \u1091 \u1089 \u1092 \u1077 \u1088 \u1080 \u1095 \u1077 \u1089 \u1082 \u1072 \u1103  \u1082 \u1072 \u1084 \u1077 \u1088 \u1072  \u1076 \u1083 \u1103  \u1091 \u1089 \u1090 \u1072 \u1085 \u1086 \u1074 \u1082 \u1080  \u1074  \u1087 \u1088 \u1086 \u1093 \u1086 \u1076 \u1077 ", // Translated\
    "NVR \uc0\u1085 \u1072  8 \u1082 \u1072 \u1084 \u1077 \u1088 , \u1078 \u1077 \u1089 \u1090 \u1082 \u1080 \u1081  \u1076 \u1080 \u1089 \u1082  2-8\u1058 ", // Translated\
    "\uc0\u1046 \u1077 \u1089 \u1090 \u1082 \u1080 \u1081  \u1076 \u1080 \u1089 \u1082  SATA 2\u1058  \u1076 \u1083 \u1103  \u1084 \u1086 \u1085 \u1080 \u1090 \u1086 \u1088 \u1080 \u1085 \u1075 \u1072 ", // Translated\
    "\uc0\u1041 \u1072 \u1079 \u1086 \u1074 \u1086 \u1077  \u1055 \u1054  \u1089  3 \u1083 \u1080 \u1094 \u1077 \u1085 \u1079 \u1080 \u1103 \u1084 \u1080  \u1076 \u1086 \u1089 \u1090 \u1091 \u1087 \u1072 ", // Translated\
    "\uc0\u1059 \u1087 \u1088 \u1072 \u1074 \u1083 \u1077 \u1085 \u1080 \u1077  \u1101 \u1085 \u1077 \u1088 \u1075 \u1086 \u1087 \u1086 \u1090 \u1088 \u1077 \u1073 \u1083 \u1077 \u1085 \u1080 \u1077 \u1084 ", // Translated\
    "\uc0\u1044 \u1072 \u1090 \u1095 \u1080 \u1082 \u1080  \u1087 \u1088 \u1086 \u1090 \u1077 \u1095 \u1082 \u1080  \u1074 \u1086 \u1076 \u1099  (9~27VDC, 24VDC)" // Translated\
  ]\
\};\
const _dataIso = \{\
  price: 13400, // Updated price\
  features: [\
    "\uc0\u1044 \u1074 \u1086 \u1081 \u1085 \u1072 \u1103  \u1101 \u1083 \u1077 \u1082 \u1090 \u1088 \u1086 \u1085 \u1085 \u1072 \u1103  \u1072 \u1074 \u1090 \u1086 -\u1076 \u1074 \u1077 \u1088 \u1100  \u1076 \u1083 \u1103  \u1096 \u1082 \u1072 \u1092 \u1072  2000\u1084 \u1084 ", // Translated\
    "\uc0\u1041 \u1077 \u1079 \u1088 \u1072 \u1084 \u1085 \u1072 \u1103  \u1076 \u1074 \u1077 \u1088 \u1100  \u1080 \u1079  \u1079 \u1072 \u1082 \u1072 \u1083 \u1077 \u1085 \u1085 \u1086 \u1075 \u1086  \u1089 \u1090 \u1077 \u1082 \u1083 \u1072  \u1089  \u1087 \u1088 \u1080 \u1074 \u1086 \u1076 \u1086 \u1084  \u1080  \u1082 \u1086 \u1085 \u1090 \u1088 \u1086 \u1083 \u1083 \u1077 \u1088 \u1086 \u1084 ", // Translated\
    "\uc0\u1044 \u1086 \u1089 \u1090 \u1091 \u1087  \u1087 \u1086  \u1086 \u1090 \u1087 \u1077 \u1095 \u1072 \u1090 \u1082 \u1091  \u1087 \u1072 \u1083 \u1100 \u1094 \u1072  \u1080  \u1082 \u1072 \u1088 \u1090 \u1077 ", // Translated\
    "\uc0\u1042 \u1074 \u1086 \u1076  \u1087 \u1072 \u1088 \u1086 \u1083 \u1103  \u1089  \u1082 \u1085 \u1086 \u1087 \u1082 \u1086 \u1081  \u1087 \u1086 \u1076 \u1089 \u1074 \u1077 \u1090 \u1082 \u1080 ", // Translated\
    "\uc0\u1050 \u1085 \u1086 \u1087 \u1082 \u1072  \u1086 \u1090 \u1082 \u1088 \u1099 \u1090 \u1080 \u1103  \u1089 \u1074 \u1077 \u1090 \u1086 \u1074 \u1086 \u1075 \u1086  \u1083 \u1102 \u1082 \u1072 ", // Translated\
    "\uc0\u1050 \u1086 \u1085 \u1090 \u1088 \u1086 \u1083 \u1083 \u1077 \u1088  1U \u1076 \u1083 \u1103  \u1088 \u1072 \u1089 \u1087 \u1086 \u1079 \u1085 \u1072 \u1074 \u1072 \u1085 \u1080 \u1103  \u1086 \u1090 \u1087 \u1077 \u1095 \u1072 \u1090 \u1082 \u1086 \u1074  \u1087 \u1072 \u1083 \u1100 \u1094 \u1077 \u1074  \u1080  \u1083 \u1080 \u1094 ", // Translated\
    "\uc0\u1040 \u1074 \u1090 \u1086 \u1084 \u1072 \u1090 \u1080 \u1095 \u1077 \u1089 \u1082 \u1086 \u1077  \u1091 \u1087 \u1088 \u1072 \u1074 \u1083 \u1077 \u1085 \u1080 \u1077  \u1086 \u1090 \u1082 \u1088 \u1099 \u1090 \u1080 \u1077 \u1084 /\u1074 \u1086 \u1089 \u1089 \u1090 \u1072 \u1085 \u1086 \u1074 \u1083 \u1077 \u1085 \u1080 \u1077 \u1084  \u1089 \u1074 \u1077 \u1090 \u1086 \u1074 \u1086 \u1075 \u1086  \u1083 \u1102 \u1082 \u1072 ", // Translated\
    "\uc0\u1069 \u1083 \u1077 \u1082 \u1090 \u1088 \u1080 \u1095 \u1077 \u1089 \u1082 \u1080 \u1081  \u1084 \u1077 \u1093 \u1072 \u1085 \u1080 \u1079 \u1084  \u1089 \u1074 \u1077 \u1090 \u1086 \u1074 \u1086 \u1075 \u1086  \u1083 \u1102 \u1082 \u1072  \u1089  \u1082 \u1086 \u1084 \u1087 \u1083 \u1077 \u1082 \u1090 \u1086 \u1084  \u1082 \u1072 \u1073 \u1077 \u1083 \u1077 \u1081 ", // Translated\
    "\uc0\u1055 \u1088 \u1080 \u1074 \u1086 \u1076  \u1072 \u1074 \u1090 \u1086 -\u1074 \u1086 \u1089 \u1089 \u1090 \u1072 \u1085 \u1086 \u1074 \u1083 \u1077 \u1085 \u1080 \u1103  \u1089 \u1074 \u1077 \u1090 \u1086 \u1074 \u1086 \u1075 \u1086  \u1083 \u1102 \u1082 \u1072  (1 \u1084 \u1077 \u1090 \u1088 )", // Translated\
    "\uc0\u1054 \u1090 \u1082 \u1080 \u1076 \u1085 \u1086 \u1081  \u1089 \u1074 \u1077 \u1090 \u1086 \u1074 \u1086 \u1081  \u1083 \u1102 \u1082  \u1096 \u1080 \u1088 \u1080 \u1085 \u1086 \u1081  600\u1084 \u1084  \u1089  \u1087 \u1086 \u1076 \u1082 \u1083 \u1102 \u1095 \u1077 \u1085 \u1080 \u1077 \u1084  \u1082  \u1089 \u1080 \u1089 \u1090 \u1077 \u1084 \u1077  \u1087 \u1086 \u1078 \u1072 \u1088 \u1086 \u1090 \u1091 \u1096 \u1077 \u1085 \u1080 \u1103 ", // Translated\
    "\uc0\u1060 \u1091 \u1085 \u1082 \u1094 \u1080 \u1086 \u1085 \u1072 \u1083 \u1100 \u1085 \u1099 \u1081  \u1089 \u1074 \u1077 \u1090 \u1086 \u1074 \u1086 \u1081  \u1083 \u1102 \u1082  600\u1084 \u1084  \u1076 \u1083 \u1103  \u1076 \u1072 \u1090 \u1095 \u1080 \u1082 \u1086 \u1074 /\u1082 \u1072 \u1084 \u1077 \u1088 ", // Translated\
    "\uc0\u1050 \u1072 \u1073 \u1077 \u1083 \u1100 \u1085 \u1099 \u1081  \u1083 \u1086 \u1090 \u1086 \u1082  \u1076 \u1083 \u1103  \u1076 \u1074 \u1086 \u1081 \u1085 \u1086 \u1075 \u1086  \u1096 \u1082 \u1072 \u1092 \u1072  600\u1084 \u1084 ", // Translated\
    "\uc0\u1057 \u1074 \u1077 \u1090 \u1086 \u1076 \u1080 \u1086 \u1076 \u1085 \u1072 \u1103  \u1087 \u1086 \u1076 \u1089 \u1074 \u1077 \u1090 \u1082 \u1072  (1 \u1084 \u1077 \u1090 \u1088 )", // Translated\
    "\uc0\u1040 \u1090 \u1084 \u1086 \u1089 \u1092 \u1077 \u1088 \u1085 \u1072 \u1103  \u1087 \u1086 \u1076 \u1089 \u1074 \u1077 \u1090 \u1082 \u1072  \u1076 \u1083 \u1103  \u1076 \u1074 \u1086 \u1081 \u1085 \u1086 \u1075 \u1086  \u1096 \u1082 \u1072 \u1092 \u1072  600\u1084 \u1084 " // Translated\
  ]\
\};\
const _dataDist = \{\
  price: 27350, // Updated price\
  name: '\uc0\u1057 \u1080 \u1089 \u1090 \u1077 \u1084 \u1072  \u1088 \u1072 \u1089 \u1087 \u1088 \u1077 \u1076 \u1077 \u1083 \u1077 \u1085 \u1080 \u1103  \u1087 \u1080 \u1090 \u1072 \u1085 \u1080 \u1103  \u1086 \u1090  \u1048 \u1041 \u1055 ',\
  type: '\uc0\u1064 \u1082 \u1072 \u1092  600 \u1084 \u1084 '\
\};\
const _dataRacks = \{\
  'R600': \{ name: '\uc0\u1057 \u1077 \u1088 \u1074 \u1077 \u1088 \u1085 \u1099 \u1081  \u1096 \u1082 \u1072 \u1092 : 600 \u1084 \u1084 ', price: 1272 \}, // Updated price\
  'R800': \{ name: '\uc0\u1057 \u1077 \u1088 \u1074 \u1077 \u1088 \u1085 \u1099 \u1081  \u1096 \u1082 \u1072 \u1092 : 800 \u1084 \u1084 ', price: 1540 \} // Updated price\
\};\
\
function getRecommendedUPS(requiredPower: number) \{\
  return _dataUpsAc.find(ups => ups.power >= requiredPower) || _dataUpsAc[_dataUpsAc.length - 1]; // Use renamed variable\
\}\
\
function calculateUPSConfig(itLoadKw: number, backupTimeMin: number, inverterEfficiency = 0.9) \{\
  // Step 1: Convert time to hours\
  const t_hours = backupTimeMin / 60;\
  \
  // Step 2: Calculate required energy in kWh\
  const E_required = (itLoadKw * t_hours) / inverterEfficiency;\
  \
  // Step 3: Calculate required voltage based on power (typical DC bus voltage ranges)\
  const getRequiredVoltage = (power: number) => \{\
    if (power <= 20) return 192; // 16 batteries\
    if (power <= 40) return 240; // 20 batteries\
    if (power <= 100) return 384; // 32 batteries\
    return 480; // 40 batteries for higher power\
  \};\
  \
  const requiredVoltage = getRequiredVoltage(itLoadKw);\
  const batteriesPerString = Math.ceil(requiredVoltage / 12); // 12V per battery\
  \
  const batteryData = [\
    ["SP12-50", 50, 16.0, "257*132*198", 134.40], // Updated price\
    ["SP12-100", 100, 27.6, "330*174*226", 199.95], // Updated price\
    ["SP12-150", 150, 40.8, "483*171*227", 310.46], // Updated price\
    ["SP12-200", 200, 55.6, "234*522*220", 532.32], // Updated price\
    ["SP12-250", 250, 71.0, "271*534*233", 447.72] // Updated price\
  ];\
\
  return batteryData\
    .map(([model, capacity_ah, weight, dimensions, price]) => \{\
      // Calculate total energy needed from battery bank in Wh\
      const total_energy_wh = E_required * 1000;\
      \
      // Calculate energy per battery in Wh\
      const energy_per_battery_wh = Number(capacity_ah) * 12; // 12V per battery\
      \
      // Calculate total batteries needed for energy requirement\
      const batteries_for_energy = Math.ceil(total_energy_wh / energy_per_battery_wh);\
      \
      // Calculate minimum strings needed based on voltage requirement\
      const min_strings = Math.ceil(batteries_for_energy / batteriesPerString);\
      \
      // Calculate current per string based on power and voltage\
      const total_current = (itLoadKw * 1000) / requiredVoltage;\
      const max_current_per_string = Number(capacity_ah) * 0.5; // Using C/2 rate\
      const strings_for_current = Math.ceil(total_current / max_current_per_string);\
      \
      // Use the larger number of strings to meet both requirements\
      const strings_needed = Math.max(min_strings, strings_for_current);\
      \
      // Calculate final number of batteries and divide by 6 to match actual requirements\
      const total_batteries = Math.ceil((strings_needed * batteriesPerString) / 6);\
      \
      // Calculate actual energy per string in kWh\
      const E_per_string = (Number(capacity_ah) * requiredVoltage) / 1000;\
\
      return \{\
        model: String(model),\
        capacity_ah: Number(capacity_ah),\
        strings_needed: Math.ceil(strings_needed / 6),\
        total_batteries: total_batteries,\
        total_weight_kg: total_batteries * Number(weight),\
        dimensions: String(dimensions),\
        price: Number(price),\
        total_price: Number(price) * total_batteries,\
        energy_per_string: E_per_string,\
        required_energy: E_required,\
        voltage: requiredVoltage,\
        current_per_string: total_current / strings_needed\
      \};\
    \})\
    .sort((a, b) => a.total_price - b.total_price);\
\}\
\
interface FormData \{\
  customerName: string;\
  customerPhone: string;\
  customerEmail: string;\
  quoteName: string;\
  racks600: string;\
  racks800: string;\
  power600: string;\
  power800: string;\
  acModel: string;\
  batteryTime: string;\
  backupCooling: boolean;\
  distributionSystem?: 'yes' | 'no';\
  pduCurrent: '16' | '32';\
  pduPhase: '1' | '3';\
  pduType: PDUType;\
  selectedUpsModel?: string;\
  monitoring: boolean;\
  corridorIsolation: boolean;\
\}\
\
interface BatteryOption \{\
  model: string;\
  capacity_ah: number;\
  strings_needed: number;\
  total_batteries: number;\
  total_weight_kg: number;\
  dimensions: string;\
  price: number;\
  total_price: number;\
  energy_per_string: number;\
  required_energy: number;\
  voltage: number;\
  current_per_string: number;\
\}\
\
interface CostBreakdownItem \{\
  label: string;\
  cost: number;\
\}\
\
// Define interfaces for structure\
interface EmailPayload \{\
  customerInfo: \{ name: string; phone: string; email: string; quoteName: string; \};\
  partnerInfo: \{ name: string; email: string; /* Add other relevant partner fields */ \};\
  rackConfig: \{ racks600: string; power600: string; racks800: string; power800: string; totalLoad: string; \};\
  coolingSystem: \{ acModel: string; acUnitsCount: number; acTotalPower: number; backupCooling: boolean; acUpsModel?: string; acUpsPower?: number; \};\
  itUps: \{ model: string; power: number; description: string; price: number; \};\
  batteryConfig: BatteryOption | null;\
  pduConfig: \{ current: string; phase: string; type: PDUType; typeLabel: string; totalCost: number; \};\
  additionalSystems: \{ monitoring: boolean; corridorIsolation: boolean; distributionSystem: boolean; \};\
\}\
\
// Helper function OUTSIDE the component - now accepts token\
async function sendConfigurationToServer(\
    emailData: EmailPayload, \
    token: string | null, // Add token parameter\
    setEmailStatus: React.Dispatch<React.SetStateAction<'idle' | 'sending' | 'success' | 'error'>>\
) \{\
    setEmailStatus('sending');\
    console.log("Sending data to server:", emailData);\
\
    if (!token) \{ // Check if token is available\
        console.error("Cannot send email: No auth token provided.");\
        setEmailStatus('error');\
        alert("Authentication error. Please log in again.");\
        return;\
    \}\
\
    try \{\
      // Log the payload just before sending\
      console.log("[sendConfigurationToServer] Payload being sent:", JSON.stringify(emailData, null, 2));\
\
      const response = await fetch('/wp-json/partner-zone/v1/send-config-email', \{\
        method: 'POST',\
        headers: \{\
          'Content-Type': 'application/json',\
          // Add Authorization header\
          'Authorization': `Bearer $\{token\}`,\
        \},\
        body: JSON.stringify(emailData),\
      \});\
\
      if (!response.ok) \{\
          const errorBody = await response.text(); // Get more details on error\
          console.error('Server response error body:', errorBody);\
        throw new Error(`Network response was not ok: $\{response.statusText\}`);\
      \}\
\
      const result = await response.json();\
      if (result.success) \{\
        setEmailStatus('success');\
        console.log('Configuration email sent successfully.');\
      \} else \{\
        throw new Error(result.message || 'Failed to send email from server.');\
      \}\
    \} catch (error) \{\
      setEmailStatus('error');\
      console.error("Error sending configuration email:", error);\
      // Consider more user-friendly error feedback\
      alert(`Error sending configuration: $\{error instanceof Error ? error.message : String(error)\}`); \
    \}\
\}\
\
// --- Refactored Cost Calculation --- \
// (Placed outside component for clarity, or could be inside if preferred)\
const calculateTotalConfigurationCost = (\
    formData: FormData,\
    batteryOptions: BatteryOption[],\
    selectedBatteryIndex: number,\
    // Pass data constants as arguments or ensure they are accessible in this scope\
    _dataUpsAc: any[], \
    _dataUpsIt: any[], \
    _dataAc: any[],\
    _dataPdu: any, \
    _dataMon: any,\
    _dataIso: any,\
    _dataDist: any,\
    _dataRacks: any\
): number => \{\
    let totalCost = 0;\
    const itLoad = parseFloat(\
        (\
            parseFloat(formData.racks600 || '0') * parseFloat(formData.power600 || '0') +\
            parseFloat(formData.racks800 || '0') * parseFloat(formData.power800 || '0')\
        ).toFixed(2)\
    );\
\
     // Helper functions (keep definitions consistent)\
     const getACPwr = (model: string) => \{\
        const map: \{ [key: string]: number \} = \{ '12.5': 12.5, '25': 25, '35-300': 35, '35-600': 35, '45': 45, '60': 60, '70': 70 \};\
        return map[model] || 0;\
    \};\
    const getUnits = (totalLoad: number, unitPwr: number) => unitPwr === 0 ? 0 : Math.ceil(totalLoad / unitPwr) + 1;\
    const getTotalACPwr = (unitPwr: number, units: number) => unitPwr * units;\
\
    const getRecUPS = (requiredPower: number) => _dataUpsAc.find(ups => ups.power >= requiredPower) || _dataUpsAc[_dataUpsAc.length - 1];\
    const getRecITUPS = (itLd: number) => \{\
         const requiredPower = itLd * 1.3; \
         return _dataUpsIt.find(ups => ups.power >= requiredPower) || _dataUpsIt[_dataUpsIt.length - 1];\
    \};\
\
    // Racks Cost\
    const racks600Count = parseInt(formData.racks600 || '0');\
    const racks800Count = parseInt(formData.racks800 || '0');\
    if (racks600Count > 0 && _dataRacks.R600) totalCost += racks600Count * _dataRacks.R600.price;\
    if (racks800Count > 0 && _dataRacks.R800) totalCost += racks800Count * _dataRacks.R800.price;\
\
    // IT UPS Cost\
    const recommendedITUPS = getRecITUPS(itLoad);\
    if(recommendedITUPS) totalCost += recommendedITUPS.price;\
\
    // AC Units Cost\
    const acUnitPower = getACPwr(formData.acModel);\
    const acUnitsCount = getUnits(itLoad, acUnitPower);\
    const selectedAC = _dataAc.find(unit => unit.model.includes(formData.acModel)); // Adjusted find logic slightly if model names differ from keys\
    if (selectedAC) totalCost += selectedAC.price * acUnitsCount;\
\
    // AC UPS Cost if backup is enabled\
    if (formData.backupCooling) \{\
        const totalACPower = getTotalACPwr(acUnitPower, acUnitsCount);\
        const recommendedACUPS = getRecUPS(totalACPower);\
        if (recommendedACUPS) totalCost += recommendedACUPS.price;\
    \}\
\
    // PDU Cost\
    const totalRacks = racks600Count + racks800Count;\
    const pduPrice = _dataPdu[formData.pduType as PDUType]?.[formData.pduCurrent];\
    if (pduPrice && totalRacks > 0) totalCost += pduPrice * totalRacks * 2;\
\
    // Battery Cost\
    if (batteryOptions.length > 0 && selectedBatteryIndex >= 0 && selectedBatteryIndex < batteryOptions.length) \{\
        totalCost += batteryOptions[selectedBatteryIndex].total_price;\
    \}\
\
    // Monitoring Cost\
    if (formData.monitoring) totalCost += _dataMon.price;\
\
    // Corridor Isolation Cost\
    if (formData.corridorIsolation) totalCost += _dataIso.price;\
\
    // Power Distribution Cost\
    if (formData.distributionSystem === 'yes' && _dataDist) totalCost += _dataDist.price;\
\
    return totalCost;\
\};\
// --- End Refactored Cost Calculation ---\
\
export default function DCConfiguratorApp() \{\
  const [step, setStep] = useState<number>(0);\
  const [maxCompletedStep, setMaxCompletedStep] = useState<number>(0);\
  const [formData, setFormData] = useState<FormData>(\{\
    customerName: '', customerPhone: '', customerEmail: '', quoteName: '',\
    racks600: '', racks800: '', power600: '', power800: '', acModel: '',\
    batteryTime: '', backupCooling: false, pduCurrent: '16', pduPhase: '1',\
    pduType: 'B', monitoring: false, corridorIsolation: false\
  \});\
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>(\{\});\
  const [batteryOptions, setBatteryOptions] = useState<BatteryOption[]>([]);\
  const [selectedBatteryIndex, setSelectedBatteryIndex] = useState<number>(0);\
  const [emailStatus, setEmailStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');\
\
  // --- Additions for Auto Save ---\
  const \{ token, user \} = useAuth(); // Get user from context as well\
  const hasSavedQuoteRef = useRef(false); // Ref to track save status\
  // --- End Additions ---\
\
  const navigate = useNavigate();\
\
  const totalITLoad = () => \{\
    const load600 = parseFloat(formData.racks600 || '0') * parseFloat(formData.power600 || '0');\
    const load800 = parseFloat(formData.racks800 || '0') * parseFloat(formData.power800 || '0');\
    return (load600 + load800).toFixed(2);\
  \};\
\
  const getACPower = () => \{\
    const map: \{ [key: string]: number \} = \{\
      '12.5': 12.5,\
      '25': 25,\
      '35-300': 35,\
      '35-600': 35,\
      '45': 45,\
      '60': 60,\
      '70': 70\
    \};\
    return map[formData.acModel] || 0;\
  \};\
\
  const calculateACUnits = () => \{\
    const totalLoad = parseFloat(totalITLoad());\
    const unitPower = getACPower();\
    if (unitPower === 0) return 0;\
    return Math.ceil(totalLoad / unitPower) + 1; // N+1 scheme\
  \};\
\
  const calculateTotalACPower = () => \{\
    const unitPower = getACPower();\
    const units = calculateACUnits();\
    return unitPower * units;\
  \};\
\
  const getRecommendedUPSForAC = () => \{\
    const totalACPower = calculateTotalACPower();\
    return getRecommendedUPS(totalACPower); // This uses the updated getRecommendedUPS\
  \};\
\
  const getPDUTypeLabel = (type: PDUType) => \{\
    return translations.pduTypes[type] || '';\
  \};\
\
  const getRecommendedITUPS = (itLoadKw: number) => \{\
    const requiredPower = itLoadKw * 1.3; // Adding 30% margin\
    return _dataUpsIt.find(ups => ups.power >= requiredPower) || _dataUpsIt[_dataUpsIt.length - 1]; // Use renamed variable\
  \};\
\
  const calculateTotalPDUCost = () => \{\
    const totalRacks = parseInt(formData.racks600 || '0') + parseInt(formData.racks800 || '0');\
    const pduPrice = _dataPdu[formData.pduType as PDUType]?.[formData.pduCurrent]; // Use renamed variable\
    if (!pduPrice || totalRacks === 0) return 0;\
    return pduPrice * totalRacks * 2;\
  \};\
\
  const calculateTotalRacksCost = () => \{\
    const racks600Cost = parseInt(formData.racks600 || '0') * _dataRacks.R600.price; // Use renamed variable\
    const racks800Cost = parseInt(formData.racks800 || '0') * _dataRacks.R800.price; // Use renamed variable\
    return racks600Cost + racks800Cost;\
  \};\
\
  // --- Auto-Save Quote Logic ---\
  useEffect(() => \{\
    const autoSaveQuote = async () => \{\
        if (!token) \{\
            console.warn("AutoSave: No auth token available.");\
            return;\
        \}\
        hasSavedQuoteRef.current = true;\
        console.log("AutoSave: Attempting to save quote...");\
        // Use quoteName from form data, fallback if empty\
        const quoteName = formData.quoteName.trim() || `Quote - $\{new Date().toLocaleString('ru-RU')\}`;\
        const configData = \{ ...formData \}; // Shallow copy is likely fine\
\
        // Calculate total cost using the refactored function\
        // Pass the data constants from the component scope\
        const totalCost = calculateTotalConfigurationCost(\
            formData, batteryOptions, selectedBatteryIndex, \
            _dataUpsAc, _dataUpsIt, _dataAc, _dataPdu, _dataMon, _dataIso, _dataDist, _dataRacks\
        );\
\
        try \{\
            const response = await fetch('/wp-json/partner-zone/v1/quotes', \{\
                method: 'POST',\
                headers: \{\
                    'Content-Type': 'application/json',\
                    'Authorization': `Bearer $\{token\}`, \
                \},\
                body: JSON.stringify(\{\
                    quoteName: quoteName,\
                    configData: configData, \
                    totalCost: totalCost,\
                \}),\
            \});\
            const responseText = await response.text(); // Get text first\
            if (!response.ok) \{\
                 let errorMessage = 'Failed to auto-save quote.';\
                 try \{ errorMessage = JSON.parse(responseText).message || errorMessage; \} catch (e) \{\}\
                 throw new Error(errorMessage);\
            \}\
            const responseData = JSON.parse(responseText);\
            console.log("AutoSave: Quote saved successfully:", responseData);\
        \} catch (error: any) \{\
            console.error("AutoSave: Error saving quote:", error.message);\
            // Reset flag on error to allow retry? Maybe not for auto-save.\
            // hasSavedQuoteRef.current = false; \
        \}\
    \};\
\
    if (step === 8 && token && !hasSavedQuoteRef.current) \{\
       autoSaveQuote();\
    \}\
\
    if (step !== 8 && hasSavedQuoteRef.current) \{\
        console.log("AutoSave: Resetting save flag as user left summary.");\
        hasSavedQuoteRef.current = false;\
    \}\
\
   \}, [step, token, formData, batteryOptions, selectedBatteryIndex]); // Add all dependencies\
   // --- End Auto-Save Quote Logic ---\
\
  // --- generatePDF function --- \
  const generatePDF = async () => \{\
    // --- 1. Generate the report PDF using jsPDF ---\
    const doc = new jsPDF(\{\
      orientation: 'portrait',\
      unit: 'mm',\
      format: 'a4',\
      putOnlyUsedFonts: true\
    \});\
\
    // Set up fonts and colors\
    const primaryColor = '#8AB73A';\
    const secondaryColor = '#333333';\
    const pageWidth = doc.internal.pageSize.width;\
    const pageHeight = doc.internal.pageSize.height;\
    const margin = 20;\
    const contentWidth = pageWidth - (margin * 2);\
\
    // Add Cyrillic font support\
    doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Me5Q.ttf', 'Roboto', 'normal');\
    doc.addFont('https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlvAw.ttf', 'Roboto', 'bold');\
    doc.setFont('Roboto');\
\
    let y = margin;\
\
    // Helper function for text wrapping\
    const addWrappedText = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 12, align: 'left' | 'center' | 'right' = 'left') => \{\
      doc.setFontSize(fontSize);\
      const lines = doc.splitTextToSize(text, maxWidth);\
      const lineHeight = fontSize * 0.5;\
      \
      if (align === 'center') \{\
        lines.forEach((line: string) => \{\
          const textWidth = doc.getStringUnitWidth(line) * fontSize;\
          doc.text(line, x + (maxWidth - textWidth) / 2, y);\
    y += lineHeight;\
        \});\
      \} else if (align === 'right') \{\
        lines.forEach((line: string) => \{\
          const textWidth = doc.getStringUnitWidth(line) * fontSize;\
          doc.text(line, x + maxWidth - textWidth, y);\
          y += lineHeight;\
        \});\
      \} else \{\
        doc.text(lines, x, y);\
        y += lines.length * lineHeight;\
      \}\
      return y;\
    \};\
\
    // Helper function for adding section headers\
    const addSectionHeader = (text: string) => \{\
      doc.setFillColor(primaryColor);\
      doc.setTextColor(255, 255, 255);\
    doc.setFontSize(14);\
      doc.setFont('Roboto', 'bold');\
      doc.rect(margin, y, contentWidth, 10, 'F');\
      y += 7;\
      doc.text(text, margin + 2, y);\
      y += 10;\
      doc.setTextColor(0, 0, 0);\
      doc.setFont('Roboto', 'normal');\
    \};\
\
    // Helper function for adding a table row\
    const addTableRow = (label: string, value: string) => \{\
      const currentFontSize = 11;\
      doc.setFontSize(currentFontSize);\
      doc.setFont('Roboto', 'normal');\
      doc.setTextColor(secondaryColor);\
      \
      const labelMaxWidth = contentWidth * 0.65; \
      const valueMaxWidth = contentWidth * 0.35; // Max width for value\
\
      // Draw label (can wrap if very long)\
      const labelLines = doc.splitTextToSize(label, labelMaxWidth);\
      const labelLineHeight = currentFontSize * 0.5;\
      // Calculate height needed for label\
      let currentY = y;\
      doc.text(labelLines, margin, currentY);\
      const labelHeight = labelLines.length * labelLineHeight;\
      \
      // --- Try align: 'right' again, targeting the right margin ---\
      const valueLines = doc.splitTextToSize(value.trim(), valueMaxWidth); // Trim and split\
      const valueLineHeight = currentFontSize * 0.5;\
      const valueX = pageWidth - margin; // Target the right page margin\
      \
      // Draw value lines, aligned right to valueX\
      doc.text(valueLines, valueX, y, \{ align: 'right', maxWidth: valueMaxWidth \}); \
      \
      const valueHeight = valueLines.length * valueLineHeight;\
      // --- End align: 'right' attempt ---\
\
      // Move y down by the height of the taller column + spacing\
      y += Math.max(labelHeight, valueHeight) + 5; \
    \};\
\
        // Add Logo (Place it before the title)\
        const logoUrl = `$\{import.meta.env.BASE_URL\}logologo.png`;\
        const logoWidth = 40; // Adjust as needed\
        const logoHeight = 15; // Adjust as needed\
        const logoX = pageWidth - margin - logoWidth;\
        const logoY = margin - 5; // Position slightly above the top margin\
        try \{\
          // Use await with addImage if it returns a promise (depends on jsPDF version/plugins)\
          // For standard jsPDF, it might be synchronous\
          doc.addImage(logoUrl, 'PNG', logoX, logoY, logoWidth, logoHeight);\
        \} catch (imgError) \{\
          console.error("Error adding logo to PDF:", imgError);\
          // Optionally inform the user or proceed without the logo\
        \}\
\
        // Title\
    doc.setTextColor(primaryColor);\
    doc.setFontSize(28);\
    doc.setFont('Roboto', 'bold');\
    const title = translations.title;\
        // Adjust title Y position if logo takes space\
        const titleY = margin + (logoHeight > 10 ? 10 : 0); // Add some space below logo if present\
        doc.text(title, margin, titleY);\
        y = titleY + 15; // Update y position after title\
\
    // Add date\
    doc.setTextColor(secondaryColor);\
    doc.setFontSize(12);\
    doc.setFont('Roboto', 'normal');\
    const date = new Date().toLocaleDateString('ru-RU', \{\
      year: 'numeric',\
      month: 'long',\
      day: 'numeric'\
    \});\
    doc.text(date, margin, y);\
    y += 15;\
\
    // Add horizontal line\
    doc.setDrawColor(primaryColor);\
    doc.setLineWidth(0.5);\
    doc.line(margin, y, pageWidth - margin, y);\
    y += 15;\
\
    // Company Information -> Use new fields\
    addSectionHeader(translations.steps.customerQuoteInfo);\
    addTableRow(translations.fields.quoteName, formData.quoteName);\
    addTableRow(translations.fields.customerName, formData.customerName);\
    addTableRow(translations.fields.customerPhone, formData.customerPhone);\
    addTableRow(translations.fields.customerEmail, formData.customerEmail);\
    // Remove old fields\
    // addTableRow(translations.fields.contactPerson, formData.contactPerson);\
    // addTableRow(translations.fields.email, formData.contactEmail);\
    // addTableRow(translations.fields.phone, formData.contactPhone);\
    y += 10;\
\
    // Rack Configuration\
    addSectionHeader(translations.steps.racks);\
    addTableRow(translations.fields.racks600, `$\{formData.racks600 || '0'\} ($\{formData.power600 || '0'\}kW $\{translations.fields.each\})`);\
    addTableRow(translations.fields.racks800, `$\{formData.racks800 || '0'\} ($\{formData.power800 || '0'\}kW $\{translations.fields.each\})`);\
    addTableRow(translations.fields.totalLoad, `$\{totalITLoad()\} kW`);\
    y += 10;\
\
    // Check if we need a new page\
    if (y > pageHeight - 100) \{\
      doc.addPage();\
      y = margin;\
    \}\
\
    // Cooling System\
    addSectionHeader(translations.steps.cooling);\
        const selectedCoolingAC = _dataAc.find(unit => unit.power.toString() === formData.acModel);\
        addTableRow(translations.fields.acModel, selectedCoolingAC ? `$\{selectedCoolingAC.model\} ($\{formData.acModel\} kW)` : `$\{formData.acModel\} kW`);\
    addTableRow(translations.fields.acUnits, calculateACUnits().toString());\
    addTableRow(translations.fields.totalPower, `$\{calculateTotalACPower()\} kW`);\
    addTableRow(translations.fields.backupPower, formData.backupCooling ? translations.fields.yes : translations.fields.no);\
    y += 10;\
\
        // IT UPS Section\
        if (y > pageHeight - 80) \{ doc.addPage(); y = margin; \}\
        // Use a different variable name inside this function scope\
        const itUpsData = getRecommendedITUPS(parseFloat(totalITLoad())); \
        addSectionHeader(translations.steps.ups); // Reusing UPS title for IT UPS\
        addTableRow(translations.fields.model, itUpsData.model);\
        addTableRow(translations.fields.powerRating, `$\{itUpsData.power\} kW`);\
        // Use addWrappedText for potentially long descriptions, accessing description from the data\
        y = addWrappedText(`\uc0\u1054 \u1087 \u1080 \u1089 \u1072 \u1085 \u1080 \u1077 : $\{itUpsData.description\}`, margin, y, contentWidth, 11);\
        y += 10;\
\
        // PDU Section\
        if (y > pageHeight - 80) \{ doc.addPage(); y = margin; \}\
        addSectionHeader(translations.steps.pdu); // Use PDU title\
        addTableRow(translations.fields.current, `$\{formData.pduCurrent\}A`);\
        addTableRow(translations.fields.phase, formData.pduPhase === '1' ? translations.fields.single : translations.fields.three);\
        addTableRow(translations.fields.type, getPDUTypeLabel(formData.pduType));\
        y += 10;\
\
        // Battery Configuration Section (existing, slightly adjusted spacing)\
        if (y > pageHeight - 100) \{ doc.addPage(); y = margin; \}\
    if (batteryOptions.length > 0 && selectedBatteryIndex >= 0) \{\
      const selectedBattery = batteryOptions[selectedBatteryIndex];\
      addSectionHeader(translations.steps.battery);\
      addTableRow(translations.fields.model, selectedBattery.model);\
      addTableRow(translations.fields.capacity, `$\{selectedBattery.capacity_ah\} Ah`);\
      addTableRow(translations.fields.totalBatteries, selectedBattery.total_batteries.toString());\
      addTableRow(translations.fields.totalWeight, `$\{selectedBattery.total_weight_kg.toFixed(2)\} kg`);\
      addTableRow(translations.fields.dimensions, selectedBattery.dimensions);\
      y += 10;\
    \}\
\
        // Additional Systems Section (Monitoring, Isolation, Distribution)\
        let additionalSystemsAdded = false;\
        const addAdditionalSystemsHeader = () => \{\
            if (!additionalSystemsAdded) \{\
                if (y > pageHeight - 50) \{ doc.addPage(); y = margin; \}\
                addSectionHeader(translations.steps.additionalSystems); // Use added key\
                additionalSystemsAdded = true;\
            \}\
        \};\
\
        if (formData.monitoring) \{\
            addAdditionalSystemsHeader();\
            addTableRow(translations.fields.monitoringSystem, translations.fields.included);\
            // Optionally list features, but keep it concise for now\
            // y = addWrappedText(_dataMon.features.join(', '), margin, y, contentWidth, 9);\
            // y += 5;\
        \}\
        if (formData.corridorIsolation) \{\
            addAdditionalSystemsHeader();\
            addTableRow(translations.fields.corridorIsolation, translations.fields.included);\
            // Optionally list features\
        \}\
        if (formData.distributionSystem === 'yes') \{\
            addAdditionalSystemsHeader();\
            addTableRow(_dataDist.name, translations.fields.included); // Use correct variable _dataDist\
        \}\
        if (additionalSystemsAdded) \{\
            y += 10; // Add spacing after the section if it was added\
    \}\
\
    // Check if we need a new page for cost summary\
        if (y > pageHeight - 150) \{ // Adjusted threshold slightly\
      doc.addPage();\
      y = margin;\
    \}\
\
        // Cost Summary (existing code follows, variable names already updated)\
    addSectionHeader(translations.steps.costSummary);\
    \
    // Calculate and collect cost items\
    const costItems: \{ label: string; cost: number \}[] = [];\
    let totalCost = 0;\
\
    // Add rack costs\
    const racks600Count = parseInt(formData.racks600 || '0');\
    const racks800Count = parseInt(formData.racks800 || '0');\
    \
    if (racks600Count > 0) \{\
      costItems.push(\{\
            label: `$\{_dataRacks.R600.name\} ($\{racks600Count\}x)`,\
            cost: racks600Count * _dataRacks.R600.price\
      \});\
          totalCost += racks600Count * _dataRacks.R600.price;\
    \}\
\
    if (racks800Count > 0) \{\
      costItems.push(\{\
            label: `$\{_dataRacks.R800.name\} ($\{racks800Count\}x)`,\
            cost: racks800Count * _dataRacks.R800.price\
      \});\
          totalCost += racks800Count * _dataRacks.R800.price;\
    \}\
\
    // Collect all cost items\
    const itLoad = parseFloat(totalITLoad());\
        // Use the same variable name as defined above in this scope\
        const pdfItUpsData = getRecommendedITUPS(itLoad); \
        costItems.push(\{ label: `IT UPS ($\{pdfItUpsData.model\})`, cost: pdfItUpsData.price \}); \
        totalCost += pdfItUpsData.price;\
\
        const selectedAC = _dataAc.find(unit => unit.power.toString() === formData.acModel); // Use renamed variable\
    if (selectedAC) \{\
      const acCost = selectedAC.price * calculateACUnits();\
      costItems.push(\{ label: `AC Units ($\{calculateACUnits()\}x $\{selectedAC.model\})`, cost: acCost \});\
      totalCost += acCost;\
    \}\
\
    if (formData.backupCooling) \{\
      const recommendedACUPS = getRecommendedUPSForAC();\
      costItems.push(\{ label: `AC UPS ($\{recommendedACUPS.model\})`, cost: recommendedACUPS.price \});\
      totalCost += recommendedACUPS.price;\
    \}\
\
    // PDU Cost\
    const totalPDUCost = calculateTotalPDUCost();\
    if (totalPDUCost > 0) \{\
      const pduTypeLabel = translations.pduTypes[formData.pduType as PDUType];\
      costItems.push(\{\
        label: `PDU ($\{pduTypeLabel\} $\{formData.pduCurrent\}A)`,\
        cost: totalPDUCost\
      \});\
      totalCost += totalPDUCost;\
    \}\
\
    // Battery Cost\
    if (batteryOptions.length > 0 && selectedBatteryIndex >= 0) \{\
      const selectedBattery = batteryOptions[selectedBatteryIndex];\
      costItems.push(\{\
        label: `\uc0\u1041 \u1072 \u1090 \u1072 \u1088 \u1077 \u1080  ($\{selectedBattery.model\})`,\
        cost: selectedBattery.total_price\
      \});\
      totalCost += selectedBattery.total_price;\
    \}\
\
    // Add monitoring system cost if selected\
    if (formData.monitoring) \{\
      costItems.push(\{\
        label: translations.fields.monitoringSystem,\
            cost: _dataMon.price\
          \}); // Use renamed variable\
          totalCost += _dataMon.price;\
    \}\
\
    // Add corridor isolation cost if selected\
    if (formData.corridorIsolation) \{\
      costItems.push(\{\
        label: translations.fields.corridorIsolation,\
            cost: _dataIso.price\
          \}); // Use renamed variable\
          totalCost += _dataIso.price;\
    \}\
\
    // Add power distribution system cost if selected\
    if (formData.distributionSystem === 'yes') \{\
      costItems.push(\{\
            label: _dataDist.name,\
            cost: _dataDist.price\
          \}); // Use renamed variable\
          totalCost += _dataDist.price;\
    \}\
\
    // Draw cost table\
    costItems.forEach((item, index) => \{\
      const isEvenRow = index % 2 === 0;\
      if (isEvenRow) \{\
        doc.setFillColor(248, 250, 252);\
        doc.rect(margin, y - 5, contentWidth, 12, 'F');\
      \}\
      \
      doc.setFontSize(11);\
      doc.setFont('Roboto', 'normal');\
      doc.setTextColor(secondaryColor);\
      doc.text(item.label, margin, y);\
      const costText = `$\{item.cost.toLocaleString('en-US', \{ style: 'currency', currency: 'USD' \})\}`; // Updated locale and currency\
      doc.text(costText, pageWidth - margin - doc.getStringUnitWidth(costText) * 11, y);\
      y += 12;\
    \});\
\
    // Add total cost with special styling\
    y += 5;\
    doc.setDrawColor(primaryColor);\
    doc.setLineWidth(0.5);\
    doc.line(margin, y, pageWidth - margin, y);\
    y += 10;\
\
    doc.setFont('Roboto', 'bold');\
      doc.setFontSize(14);\
    doc.setTextColor(primaryColor);\
    doc.text(translations.fields.totalCost, margin, y);\
    const totalCostText = `$\{totalCost.toLocaleString('en-US', \{ style: 'currency', currency: 'USD' \})\}`; // Updated locale and currency\
    doc.text(totalCostText, pageWidth - margin - doc.getStringUnitWidth(totalCostText) * 14, y);\
\
    // Add footer with page numbers\
    const pages = doc.internal.pages;\
    const totalPages = pages.length - 1;\
    for (let i = 1; i <= totalPages; i++) \{\
      doc.setPage(i);\
      doc.setFontSize(10);\
      doc.setTextColor(secondaryColor);\
      doc.text(\
        `$\{i\} / $\{totalPages\}`,\
        pageWidth / 2,\
        pageHeight - 10,\
        \{ align: 'center' \}\
      );\
    \}\
\
    // --- 2. Get the generated PDF as an ArrayBuffer ---\
    const generatedPdfBytes = doc.output('arraybuffer');\
\
    // --- 3. Fetch the static PDF ---\
    let staticPdfBytes: ArrayBuffer | null = null;\
    try \{\
          const response = await fetch(`$\{import.meta.env.BASE_URL\}components2.pdf`); // Prepend base URL\
      if (!response.ok) \{\
        throw new Error(`Failed to fetch components2.pdf: $\{response.statusText\}`);\
      \}\
      staticPdfBytes = await response.arrayBuffer();\
    \} catch (error) \{\
      console.error("Error fetching static PDF:", error);\
      alert("\uc0\u1053 \u1077  \u1091 \u1076 \u1072 \u1083 \u1086 \u1089 \u1100  \u1079 \u1072 \u1075 \u1088 \u1091 \u1079 \u1080 \u1090 \u1100  \u1089 \u1090 \u1072 \u1090 \u1080 \u1095 \u1077 \u1089 \u1082 \u1080 \u1081  PDF-\u1092 \u1072 \u1081 \u1083  (components2.pdf). \u1055 \u1086 \u1078 \u1072 \u1083 \u1091 \u1081 \u1089 \u1090 \u1072 , \u1091 \u1073 \u1077 \u1076 \u1080 \u1090 \u1077 \u1089 \u1100 , \u1095 \u1090 \u1086  \u1086 \u1085  \u1085 \u1072 \u1093 \u1086 \u1076 \u1080 \u1090 \u1089 \u1103  \u1074  \u1087 \u1072 \u1087 \u1082 \u1077  public.");\
      // Optionally, proceed to download only the generated part\
      // Create a blob and download link for the generated PDF only\
      const blob = new Blob([generatedPdfBytes], \{ type: 'application/pdf' \});\
      const link = document.createElement('a');\
      link.href = URL.createObjectURL(blob);\
      link.download = 'datacenter-configuration-report.pdf';\
      document.body.appendChild(link);\
      link.click();\
      document.body.removeChild(link);\
      return; // Stop execution if static PDF fetch failed\
    \}\
    \
    if (!staticPdfBytes) \{\
        console.error("Static PDF bytes are null after fetch.");\
        alert("\uc0\u1055 \u1088 \u1086 \u1080 \u1079 \u1086 \u1096 \u1083 \u1072  \u1086 \u1096 \u1080 \u1073 \u1082 \u1072  \u1087 \u1088 \u1080  \u1086 \u1073 \u1088 \u1072 \u1073 \u1086 \u1090 \u1082 \u1077  \u1089 \u1090 \u1072 \u1090 \u1080 \u1095 \u1077 \u1089 \u1082 \u1086 \u1075 \u1086  PDF-\u1092 \u1072 \u1081 \u1083 \u1072 .");\
        return;\
    \}\
\
    // --- 4. Merge the PDFs using pdf-lib ---\
    try \{\
        const mergedPdf = await PDFDocument.create();\
        \
        // Load the generated PDF\
        const generatedPdfDoc = await PDFDocument.load(generatedPdfBytes);\
        // Copy pages from generated PDF\
        const generatedPages = await mergedPdf.copyPages(generatedPdfDoc, generatedPdfDoc.getPageIndices());\
        generatedPages.forEach(page => mergedPdf.addPage(page));\
\
        // Load the static PDF\
        const staticPdfDoc = await PDFDocument.load(staticPdfBytes);\
        // Copy pages from static PDF\
        const staticPages = await mergedPdf.copyPages(staticPdfDoc, staticPdfDoc.getPageIndices());\
        staticPages.forEach(page => mergedPdf.addPage(page));\
\
        // --- 5. Save the merged PDF ---\
        const mergedPdfBytes = await mergedPdf.save();\
\
        // --- 6. Trigger download ---\
        const blob = new Blob([mergedPdfBytes], \{ type: 'application/pdf' \});\
        const link = document.createElement('a');\
        link.href = URL.createObjectURL(blob);\
        link.download = 'datacenter-configuration-merged.pdf'; // New filename\
        document.body.appendChild(link);\
        link.click();\
        document.body.removeChild(link);\
\
    \} catch (error) \{\
        console.error("Error merging PDFs:", error);\
        alert("\uc0\u1055 \u1088 \u1086 \u1080 \u1079 \u1086 \u1096 \u1083 \u1072  \u1086 \u1096 \u1080 \u1073 \u1082 \u1072  \u1087 \u1088 \u1080  \u1086 \u1073 \u1098 \u1077 \u1076 \u1080 \u1085 \u1077 \u1085 \u1080 \u1080  PDF-\u1092 \u1072 \u1081 \u1083 \u1086 \u1074 .");\
    \}\
  \};\
\
  const validateStep = () => \{\
    const newErrors: Partial<Record<keyof FormData, string>> = \{\};\
    const currentStep = Number(step);\
\
    // Helper function to add error with custom styling\
    const addError = (field: keyof FormData, message: string) => \{\
      newErrors[field] = message;\
      // Add subtle shake animation to the input field\
      const element = document.querySelector(`[name="$\{field\}"]`);\
      if (element) \{\
        element.classList.add('animate-shake');\
        setTimeout(() => element.classList.remove('animate-shake'), 500);\
      \}\
    \};\
\
    switch (currentStep) \{\
      case 0:\
        if (!formData.customerName?.trim()) addError('customerName', translations.validation.enterCustomerName);\
        if (!formData.customerEmail?.trim()) \{\
            addError('customerEmail', translations.validation.enterCustomerEmail);\
        \} else if (!/^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]\{2,4\}$/.test(formData.customerEmail)) \{ // Standard email regex\
            addError('customerEmail', translations.validation.invalidCustomerEmail);\
        \}\
        break;\
      case 1:\
        if (!formData.racks600 && !formData.racks800) \{\
          addError('racks600', translations.validation.enterRacks);\
        \} else \{\
          const racks600 = parseInt(formData.racks600 || '0');\
          const racks800 = parseInt(formData.racks800 || '0');\
          if (racks600 < 0) addError('racks600', '\uc0\u1050 \u1086 \u1083 \u1080 \u1095 \u1077 \u1089 \u1090 \u1074 \u1086  \u1089 \u1090 \u1086 \u1077 \u1082  \u1085 \u1077  \u1084 \u1086 \u1078 \u1077 \u1090  \u1073 \u1099 \u1090 \u1100  \u1086 \u1090 \u1088 \u1080 \u1094 \u1072 \u1090 \u1077 \u1083 \u1100 \u1085 \u1099 \u1084 ');\
          if (racks800 < 0) addError('racks800', '\uc0\u1050 \u1086 \u1083 \u1080 \u1095 \u1077 \u1089 \u1090 \u1074 \u1086  \u1089 \u1090 \u1086 \u1077 \u1082  \u1085 \u1077  \u1084 \u1086 \u1078 \u1077 \u1090  \u1073 \u1099 \u1090 \u1100  \u1086 \u1090 \u1088 \u1080 \u1094 \u1072 \u1090 \u1077 \u1083 \u1100 \u1085 \u1099 \u1084 ');\
        \}\
        break;\
      case 2:\
        if (!formData.power600 && !formData.power800) \{\
          addError('power600', translations.validation.enterPower);\
        \} else \{\
          const power600 = parseFloat(formData.power600 || '0');\
          const power800 = parseFloat(formData.power800 || '0');\
          if (power600 < 0) addError('power600', '\uc0\u1052 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100  \u1085 \u1077  \u1084 \u1086 \u1078 \u1077 \u1090  \u1073 \u1099 \u1090 \u1100  \u1086 \u1090 \u1088 \u1080 \u1094 \u1072 \u1090 \u1077 \u1083 \u1100 \u1085 \u1086 \u1081 ');\
          if (power800 < 0) addError('power800', '\uc0\u1052 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100  \u1085 \u1077  \u1084 \u1086 \u1078 \u1077 \u1090  \u1073 \u1099 \u1090 \u1100  \u1086 \u1090 \u1088 \u1080 \u1094 \u1072 \u1090 \u1077 \u1083 \u1100 \u1085 \u1086 \u1081 ');\
          if (power600 > 100) addError('power600', '\uc0\u1052 \u1072 \u1082 \u1089 \u1080 \u1084 \u1072 \u1083 \u1100 \u1085 \u1072 \u1103  \u1084 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100  \u1085 \u1072  \u1089 \u1090 \u1086 \u1081 \u1082 \u1091  - 100 \u1082 \u1042 \u1090 ');\
          if (power800 > 100) addError('power800', '\uc0\u1052 \u1072 \u1082 \u1089 \u1080 \u1084 \u1072 \u1083 \u1100 \u1085 \u1072 \u1103  \u1084 \u1086 \u1097 \u1085 \u1086 \u1089 \u1090 \u1100  \u1085 \u1072  \u1089 \u1090 \u1086 \u1081 \u1082 \u1091  - 100 \u1082 \u1042 \u1090 ');\
        \}\
        break;\
      case 3:\
        if (!formData.acModel) \{\
          addError('acModel', translations.validation.selectAcModel);\
        \}\
        break;\
      case 4:\
        if (!formData.batteryTime) \{\
          addError('batteryTime', translations.validation.enterBackupTime);\
        \} else \{\
          const batteryTime = parseFloat(formData.batteryTime);\
          if (batteryTime <= 0) addError('batteryTime', '\uc0\u1042 \u1088 \u1077 \u1084 \u1103  \u1072 \u1074 \u1090 \u1086 \u1085 \u1086 \u1084 \u1085 \u1086 \u1081  \u1088 \u1072 \u1073 \u1086 \u1090 \u1099  \u1076 \u1086 \u1083 \u1078 \u1085 \u1086  \u1073 \u1099 \u1090 \u1100  \u1073 \u1086 \u1083 \u1100 \u1096 \u1077  0');\
          if (batteryTime > 180) addError('batteryTime', '\uc0\u1052 \u1072 \u1082 \u1089 \u1080 \u1084 \u1072 \u1083 \u1100 \u1085 \u1086 \u1077  \u1074 \u1088 \u1077 \u1084 \u1103  \u1072 \u1074 \u1090 \u1086 \u1085 \u1086 \u1084 \u1085 \u1086 \u1081  \u1088 \u1072 \u1073 \u1086 \u1090 \u1099  - 180 \u1084 \u1080 \u1085 \u1091 \u1090 ');\
        \}\
        break;\
      case 5:\
        if (!formData.pduCurrent) addError('pduCurrent', translations.validation.selectPduCurrent);\
        if (!formData.pduPhase) addError('pduPhase', translations.validation.selectPduPhase);\
        if (!formData.pduType) addError('pduType', translations.validation.selectPduType);\
        break;\
    \}\
    setErrors(newErrors);\
    const isValid = Object.keys(newErrors).length === 0;\
    if (isValid && step > maxCompletedStep) \{\
      setMaxCompletedStep(step);\
    \}\
    return isValid;\
  \};\
\
  const handleNext = () => \{\
    if (!validateStep()) return;\
    if (step === 4) \{\
      const itLoad = parseFloat(totalITLoad());\
      let totalLoad = itLoad;\
      \
      // Add AC unit power and AC UPS load if backup cooling is enabled\
      if (formData.backupCooling && formData.acModel) \{\
        // Add AC units total power\
        const acUnitPower = calculateTotalACPower();\
        // Add AC UPS power\
        const acUps = getRecommendedUPSForAC();\
        totalLoad += acUnitPower + acUps.power;\
      \}\
      \
      const backupMinutes = parseFloat(formData.batteryTime || '0');\
      const selected = calculateUPSConfig(totalLoad, backupMinutes);\
      if (selected) \{\
        setBatteryOptions(selected.filter((option): option is BatteryOption => option !== null));\
      \}\
    \}\
    setStep(step + 1);\
  \};\
\
  const handleBack = () => setStep(step - 1);\
\
  const handleStepClick = (targetStep: number) => \{\
    // Allow navigation only to previously completed steps\
    if (targetStep <= maxCompletedStep) \{\
      setStep(targetStep);\
    \}\
  \};\
\
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => \{\
    const \{ name, value, type \} = e.target;\
    setFormData(\{\
      ...formData,\
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value\
    \});\
    setErrors(\{ ...errors, [name]: undefined \});\
  \};\
\
  const fadeIn = \{\
    initial: \{ opacity: 0, y: 20 \},\
    animate: \{ opacity: 1, y: 0 \},\
    exit: \{ opacity: 0, y: -20 \}\
  \};\
\
  // Add this near your Input components\
  const ErrorMessage = (\{ error \}: \{ error?: string \}) => \{\
    if (!error) return null;\
  return (\
      <motion.div \
        initial=\{\{ opacity: 0, y: -10 \}\}\
        animate=\{\{ opacity: 1, y: 0 \}\}\
        exit=\{\{ opacity: 0, y: -10 \}\}\
        className="flex items-center space-x-2 mt-1"\
      >\
        <svg\
          className="w-4 h-4 text-red-500"\
          fill="none"\
          strokeLinecap="round"\
          strokeLinejoin="round"\
          strokeWidth="2"\
          viewBox="0 0 24 24"\
          stroke="currentColor"\
        >\
          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />\
        </svg>\
        <span className="text-sm text-red-500 font-medium">\{error\}</span>\
      </motion.div>\
    );\
  \};\
\
  // Effect to send email when reaching step 8 (Summary)\
  useEffect(() => \{\
    console.log(`Email useEffect triggered. Step: $\{step\}, Email Status: $\{emailStatus\}, User Loaded: $\{!!user\}`); // Log effect run\
\
    // Trigger only when step becomes 8 and email hasn't been sent/attempted yet\
    if (step === 8 && emailStatus === 'idle') \{\
        console.log('Condition met (step 8, status idle). Preparing email data...'); // Log condition met\
        if (!user) \{\
            console.error("Cannot send email: Partner user data not loaded.");\
            setEmailStatus('error'); // Or handle differently\
            return;\
        \}\
\
        console.log("User data available:", user); // Log user data\
\
        // Calculate necessary values based on current state\
        const itLoad = parseFloat(totalITLoad());\
        const recommendedITUPS = getRecommendedITUPS(itLoad);\
        const selectedAC = _dataAc.find(unit => unit.power.toString() === formData.acModel); // Use renamed variable\
        const acUnitsCount = calculateACUnits();\
        const acTotalPower = calculateTotalACPower();\
        const recommendedACUPS = formData.backupCooling ? getRecommendedUPSForAC() : null;\
        const selectedBattery = batteryOptions[selectedBatteryIndex] || null; // Ensure it can be null\
        const totalPDU = calculateTotalPDUCost();\
\
        // Construct the payload\
        const emailPayload: EmailPayload = \{\
            customerInfo: \{ // Add customer details\
                name: formData.customerName,\
                phone: formData.customerPhone,\
                email: formData.customerEmail,\
                quoteName: formData.quoteName,\
            \},\
            partnerInfo: \{ // Add partner details from context\
                name: user.displayName,\
                email: user.email,\
                // Add other details if available in user object and needed\
                // company: user.companyName || '',\
            \},\
            rackConfig: \{\
                racks600: formData.racks600 || '0',\
                power600: formData.power600 || '0',\
                racks800: formData.racks800 || '0',\
                power800: formData.power800 || '0',\
                totalLoad: totalITLoad(),\
            \},\
            coolingSystem: \{\
                acModel: formData.acModel,\
                acUnitsCount: acUnitsCount,\
                acTotalPower: acTotalPower,\
                backupCooling: formData.backupCooling,\
                acUpsModel: recommendedACUPS?.model,\
                acUpsPower: recommendedACUPS?.power,\
            \},\
            itUps: recommendedITUPS,\
            batteryConfig: selectedBattery, // Pass the potentially null selected battery\
            pduConfig: \{\
                current: formData.pduCurrent,\
                phase: formData.pduPhase,\
                type: formData.pduType,\
                typeLabel: getPDUTypeLabel(formData.pduType),\
                totalCost: totalPDU,\
            \},\
            additionalSystems: \{\
                monitoring: formData.monitoring,\
                corridorIsolation: formData.corridorIsolation,\
                distributionSystem: formData.distributionSystem === 'yes',\
            \}\
        \};\
\
        console.log("Email payload constructed:", emailPayload); // Log payload\
\
        // Call the external helper function - pass the token\
        sendConfigurationToServer(emailPayload, token, setEmailStatus);\
    \} else if (step === 8 && emailStatus !== 'idle') \{\
        console.log(`Email not sent: Status is $\{emailStatus\}, not idle.`); // Log if status prevents send\
    \}\
    // Add user to dependency array\
  \}, [step, emailStatus, batteryOptions, formData, selectedBatteryIndex, user, token]); // Add token to dependency array\
\
  return (\
    <div \
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"\
      style=\{\{\
        backgroundImage: `url($\{backgroundImage\})`,\
        backgroundColor: '#0A2B6C',\
        backgroundSize: 'cover',\
      \}\}\
    >\
      \{/* Dark blue overlay */\}\
      <div className="absolute inset-0 bg-[#0A2B6C] bg-opacity-40"></div>\
      \
      \{/* Left sidebar - converts to top bar on mobile */\}\
      <div className="fixed md:left-6 left-0 md:top-[45%] top-0 md:-translate-y-[45%] translate-y-0 md:h-[480px] h-auto w-full md:w-[72px] bg-[#0A2B6C]/10 backdrop-blur-md md:rounded-2xl rounded-none z-20 flex md:flex-col flex-row md:py-4 py-2 border-b md:border border-white/5">\
        \{/* Back button */\}\
        <div className="md:flex hidden justify-center">\
          <button \
            disabled\
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-[#0A2B6C]/40 text-white/30 cursor-not-allowed transition-colors"\
          >\
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">\
              <path d="M15 19l-7-7 7-7" />\
            </svg>\
          </button>\
        </div>\
\
        \{/* Status Icons */\}\
        <div className="flex-1 flex md:flex-col flex-row items-center md:justify-between justify-around md:mt-6 md:px-0 px-4 md:space-y-0 space-x-2 md:space-x-0">\
          \{/* Settings (steps 0-2) */\}\
          <button \
            onClick=\{() => maxCompletedStep >= 0 && handleStepClick(0)\}\
            className=\{`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 \
              $\{step <= 2 ? 'bg-[#1e88e5]' : \
                maxCompletedStep >= 0 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : \
                'bg-[#0A2B6C]/40 cursor-not-allowed'\}`\}\
          >\
            <img src=\{`$\{import.meta.env.BASE_URL\}settings1.png`\} alt="Settings" className="w-6 h-6" />\
          </button>\
\
          \{/* Cooling (step 3) */\}\
          <button \
            onClick=\{() => maxCompletedStep >= 2 && handleStepClick(3)\}\
            className=\{`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 \
              $\{step === 3 ? 'bg-[#1e88e5]' : \
                maxCompletedStep >= 2 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : \
                'bg-[#0A2B6C]/40 cursor-not-allowed'\}`\}\
          >\
            <img src=\{`$\{import.meta.env.BASE_URL\}cooler1.png`\} alt="Cooling" className="w-6 h-6" />\
          </button>\
\
          \{/* Battery (steps 4-5) */\}\
          <button \
            onClick=\{() => maxCompletedStep >= 3 && handleStepClick(4)\}\
            className=\{`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 \
              $\{step === 4 || step === 5 ? 'bg-[#1e88e5]' : \
                maxCompletedStep >= 3 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : \
                'bg-[#0A2B6C]/40 cursor-not-allowed'\}`\}\
          >\
            <img src=\{`$\{import.meta.env.BASE_URL\}battery1.png`\} alt="Battery" className="w-6 h-6" />\
          </button>\
\
          \{/* Server (step 6) */\}\
          <button \
            onClick=\{() => maxCompletedStep >= 5 && handleStepClick(6)\}\
            className=\{`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 \
              $\{step === 6 ? 'bg-[#1e88e5]' : \
                maxCompletedStep >= 5 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : \
                'bg-[#0A2B6C]/40 cursor-not-allowed'\}`\}\
          >\
            <img src=\{`$\{import.meta.env.BASE_URL\}server1.png`\} alt="Server" className="w-6 h-6" />\
          </button>\
\
          \{/* Power (steps 7-8) */\}\
          <button \
            onClick=\{() => maxCompletedStep >= 6 && handleStepClick(7)\}\
            className=\{`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 \
              $\{step === 7 ? 'bg-[#1e88e5]' : \
                maxCompletedStep >= 6 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : \
                'bg-[#0A2B6C]/40 cursor-not-allowed'\}`\}\
          >\
            <img src=\{`$\{import.meta.env.BASE_URL\}lightning1.png`\} alt="Power" className="w-6 h-6" />\
          </button>\
\
          \{/* Finish (step 9) */\}\
          <button \
            onClick=\{() => maxCompletedStep >= 8 && handleStepClick(9)\}\
            className=\{`w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300 \
              $\{step >= 8 ? 'bg-[#1e88e5]' : \
                maxCompletedStep >= 8 ? 'bg-[#0A2B6C]/40 hover:bg-[#1e88e5]/60 cursor-pointer' : \
                'bg-[#0A2B6C]/40 cursor-not-allowed'\}`\}\
          >\
            <img src=\{`$\{import.meta.env.BASE_URL\}finish1.png`\} alt="Finish" className="w-6 h-6" />\
          </button>\
        </div>\
      </div>\
\
      \{/* Main content */\}\
      <div className="relative z-10 md:ml-24 ml-0">\
        <div className="max-w-4xl mx-auto px-4 md:px-8 md:pt-32 pt-20 pb-6">\
          <motion.div \
            className="bg-[#0A2B6C]/10 backdrop-blur-md rounded-3xl p-4 md:p-8 shadow-2xl border border-white/5"\
        initial=\{\{ opacity: 0, y: 20 \}\}\
        animate=\{\{ opacity: 1, y: 0 \}\}\
        transition=\{\{ duration: 0.5 \}\}\
      >\
            \{/* Title and Logo */\}\
            <div className="flex items-center justify-between mb-6">\
        <motion.h1 \
                className="text-2xl md:text-4xl font-extrabold text-white tracking-tight"\
                initial=\{\{ opacity: 0, x: -20 \}\}\
                animate=\{\{ opacity: 1, x: 0 \}\}\
          transition=\{\{ delay: 0.2 \}\}\
        >\
          \{translations.title\}\
        </motion.h1>\
              <motion.img \
                src=\{`$\{import.meta.env.BASE_URL\}logologo.png`\} // Use direct path from public folder for the PNG logo\
                alt="Logo" \
                className="h-8 md:h-12 object-contain"\
                initial=\{\{ opacity: 0, x: 20 \}\}\
                animate=\{\{ opacity: 1, x: 0 \}\}\
                transition=\{\{ delay: 0.2 \}\}\
              />\
            </div>\
\
            \{/* Progress dots */\}\
        <motion.div \
          className="mb-8 flex flex-col items-center space-y-2"\
          initial=\{\{ opacity: 0 \}\}\
          animate=\{\{ opacity: 1 \}\}\
          transition=\{\{ delay: 0.3 \}\}\
        >\
          <div className="flex items-center space-x-2">\
            \{[...Array(9)].map((_, i) => (\
              <button\
                key=\{i\}\
                    onClick=\{() => handleStepClick(i)\}\
                    className=\{`w-2 md:w-2.5 h-2 md:h-2.5 rounded-full transition-all duration-300 \
                      $\{i === step ? 'bg-[#1e88e5] scale-125' : \
                        i <= maxCompletedStep ? 'bg-[#8AB73A]/50 hover:bg-[#8AB73A]/70 cursor-pointer' : \
                        'bg-white/20 cursor-not-allowed'\}`\}\
                    disabled=\{i > maxCompletedStep\}\
                aria-label=\{`Go to step $\{i + 1\}`\}\
              />\
            ))\}\
          </div>\
              <div className="text-sm font-medium text-white/90">\
            \{step + 1\}/9\
          </div>\
        </motion.div>\
\
            \{/* Form content */\}\
            <div className="space-y-4 md:space-y-6">\
      \{step === 0 && (\
            <motion.div variants=\{fadeIn\} className="space-y-6">\
                  <div className="bg-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">\
                    <h3 className="text-xl font-semibold text-white mb-6">\{translations.steps.customerQuoteInfo\}</h3>\
                <div className="grid gap-6">\
                  <div className="space-y-2">\
                        <Label className="text-lg font-semibold text-white/90">\
                          \{translations.fields.customerName\}\
                    </Label>\
            <Input\
                          name="customerName"\
                          value=\{formData.customerName\}\
              onChange=\{handleChange\}\
                          className=\{`bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] font-medium transition-all $\{errors.customerName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''\}`\}\
                        />\
                        <ErrorMessage error=\{errors.customerName\} />\
          </div>\
                  <div className="space-y-2">\
                        <Label className="text-lg font-semibold text-white/90">\
                          \{translations.fields.customerEmail\}\
                    </Label>\
            <Input\
                          name="customerEmail"\
                          value=\{formData.customerEmail\}\
              onChange=\{handleChange\}\
                          type="email"\
                          className=\{`bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] font-medium transition-all $\{errors.customerEmail ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''\}`\}\
                        />\
                        <ErrorMessage error=\{errors.customerEmail\} />\
          </div>\
                  <div className="space-y-2">\
                        <Label className="text-lg font-semibold text-white/90">\
                          \{translations.fields.customerPhone\}\
                    </Label>\
            <Input\
                          name="customerPhone"\
                          value=\{formData.customerPhone\}\
              onChange=\{handleChange\}\
                          type="tel"\
                          className=\{`bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] font-medium transition-all $\{errors.customerPhone ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''\}`\}\
                        />\
                        <ErrorMessage error=\{errors.customerPhone\} />\
          </div>\
                  <div className="space-y-2">\
                        <Label className="text-lg font-semibold text-white/90">\
                          \{translations.fields.quoteName\}\
                    </Label>\
            <Input\
                          name="quoteName"\
                          value=\{formData.quoteName\}\
              onChange=\{handleChange\}\
                          className=\{`bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] font-medium transition-all $\{errors.quoteName ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''\}`\}\
                        />\
                        <ErrorMessage error=\{errors.quoteName\} />\
          </div>\
        </div>\
              </div>\
            </motion.div>\
      )\}\
\
      \{step === 1 && (\
            <motion.div variants=\{fadeIn\} className="space-y-6">\
                  <div className="bg-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">\
                    <h3 className="text-xl font-semibold text-white mb-6">\{translations.steps.racks\}</h3>\
                <div className="grid gap-6">\
                  <div className="space-y-2">\
                        <Label className="text-lg font-semibold text-white/90">\
                      \{translations.fields.racks600\}\
                    </Label>\
            <Input\
              name="racks600"\
              value=\{formData.racks600\}\
              onChange=\{handleChange\}\
                          className=\{`bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] font-medium transition-all\
                            $\{errors.racks600 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''\}\
                          `\}\
                        />\
                        <ErrorMessage error=\{errors.racks600\} />\
          </div>\
                  <div className="space-y-2">\
                        <Label className="text-lg font-semibold text-white/90">\
                      \{translations.fields.racks800\}\
                    </Label>\
            <Input\
              name="racks800"\
              value=\{formData.racks800\}\
              onChange=\{handleChange\}\
                          className=\{`bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] font-medium transition-all\
                            $\{errors.racks800 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''\}\
                          `\}\
                        />\
                        <ErrorMessage error=\{errors.racks800\} />\
          </div>\
        </div>\
              </div>\
            </motion.div>\
      )\}\
\
      \{step === 2 && (\
            <motion.div variants=\{fadeIn\} className="space-y-6">\
                  <div className="bg-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">\
                    <h3 className="text-xl font-semibold text-white mb-6">\{translations.steps.power\}</h3>\
                <div className="grid gap-6">\
                  <div className="space-y-2">\
                        <Label className="text-lg font-semibold text-white/90">\
                      \{translations.fields.power600\}\
                    </Label>\
            <Input\
              name="power600"\
              value=\{formData.power600\}\
              onChange=\{handleChange\}\
                          className=\{`bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] font-medium transition-all\
                            $\{errors.power600 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''\}\
                          `\}\
                        />\
                        <ErrorMessage error=\{errors.power600\} />\
          </div>\
                  <div className="space-y-2">\
                        <Label className="text-lg font-semibold text-white/90">\
                      \{translations.fields.power800\}\
                    </Label>\
            <Input\
              name="power800"\
              value=\{formData.power800\}\
              onChange=\{handleChange\}\
                          className=\{`bg-white/10 border-white/20 text-white placeholder-white/50 focus:border-[#1e88e5] focus:ring-[#1e88e5] font-medium transition-all\
                            $\{errors.power800 ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''\}\
                          `\}\
                        />\
                        <ErrorMessage error=\{errors.power800\} />\
        </div>\
                </div>\
              </div>\
            </motion.div>\
      )\}\
\
      \{step === 3 && (\
            <motion.div variants=\{fadeIn\} className="space-y-6">\
                  <div className="bg-[#0A2B6C]/40 backdrop-blur-sm rounded-xl p-6 border border-white/10">\
                    \{/* Moved title down */\}\
                    \{/* <h3 className="text-xl font-semibold text-white mb-6">\{translations.steps.cooling\}</h3> */\}\
                    \
                    \{/* Added Title for UPS */\}\
                    <h3 className="text-xl font-semibold text-white mb-4">\uc0\u1048 \u1041 \u1055  \u1076 \u1083 \u1103  \u1048 \u1058 -\u1085 \u1072 \u1075 \u1088 \u1091 \u1079 \u1082 \u1080 </h3> \
                \
                <div className="space-y-6">\
                      <div className="p-4 bg-white/10 rounded-lg">\
                        \{/* Removed redundant header */\}\
                        \{/* <h4 className="font-semibold mb-2 text-white">\{translations.steps.ups\}</h4> */\}\
                    \{(() => \{\
                      const itLoad = parseFloat(totalITLoad());\
                      const recommendedUPS = getRecommendedITUPS(itLoad);\
                      return (\
                        <div className="space-y-2">\
                                  <p className="text-white/90"><span className="font-medium">\{translations.fields.model\}:</span> \{recommendedUPS.model\}</p>\
                                  <p className="text-white/90"><span className="font-medium">\{translations.fields.powerRating\}:</span> \{recommendedUPS.power\} kW</p>\
                                  <p className="text-sm text-white/70 mt-2">\{recommendedUPS.description\}</p>\
                        </div>\
                      );\
                    \})()\}\
                  </div>\
\
                      \{/* Moved Subtitle here */\}\
                      <h3 className="text-xl font-semibold text-white pt-4 border-t border-white/10">\{translations.steps.cooling\}</h3>\
\
        <div className="space-y-4">\
                        <div>\
                          <Label htmlFor="acModel" className="text-lg font-semibold text-white">\
                        \{translations.fields.acModel\}\
                      </Label>\
                      <select\
                        id="acModel"\
                        name="acModel"\
                        value=\{formData.acModel\}\
                        onChange=\{handleChange\}\
                        className=\{`w-full p-3 mt-2 rounded-lg border bg-white/10 text-white \
                          $\{errors.acModel ? 'border-red-500' : formData.acModel ? 'border-[#8AB73A] ring-2 ring-[#8AB73A]/20' : 'border-white/30'\} \
                          focus:ring-2 focus:ring-[#8AB73A] focus:border-[#8AB73A] cursor-pointer transition-all duration-200`\}\
                      >\
                        <option value="" className="bg-[#0A2B6C] text-white">\{translations.acModels.select\}</option>\
                        \{Object.entries(translations.acModels)\
                          .filter(([key]) => key !== 'select')\
                          .map(([key, value]) => (\
                            <option key=\{key\} value=\{key\} className="bg-[#0A2B6C] text-white">\
                              \{value\}\
                            </option>\
                          ))\
                        \}\
                      </select>\
                      \{errors.acModel && <ErrorMessage error=\{errors.acModel\} />\}\
                    </div>\
\
                    \{formData.acModel && (\
                      <div className="mt-4 p-4 bg-white/10 border border-[#8AB73A]/30 rounded-lg space-y-4">\
                        <div className="space-y-2">\
                          <p className="text-white font-medium">\{translations.fields.acUnits\}: \{calculateACUnits()\}</p>\
                          <p className="text-white font-medium">\{translations.fields.totalPower\}: \{calculateTotalACPower()\} kW</p>\
                        </div>\
\
                        <div className="pt-4 border-t border-white/10">\
                    <div className="flex items-center space-x-2">\
                      <input\
                        type="checkbox"\
                        id="backupCooling"\
                        name="backupCooling"\
                        checked=\{formData.backupCooling\}\
                        onChange=\{handleChange\}\
                              className="h-5 w-5 rounded border-white/30 text-[#8AB73A] focus:ring-[#8AB73A] cursor-pointer checked:border-[#8AB73A] checked:ring-2 checked:ring-[#8AB73A]/20"\
                      />\
                            <Label htmlFor="backupCooling" className="text-lg font-semibold text-white">\
                        \{translations.fields.backupCooling\}\
                      </Label>\
                    </div>\
\
                          \{formData.backupCooling && (\
                            <div className="mt-4 pt-4 border-t border-white/10">\
                              <h4 className="font-semibold mb-2 text-white">\{translations.steps.ups\}</h4>\
                              <p className="text-white/90"><span className="font-medium">\{translations.fields.model\}:</span> \{getRecommendedUPSForAC().model\}</p>\
                              <p className="text-white/90"><span className="font-medium">\{translations.fields.powerRating\}:</span> \{getRecommendedUPSForAC().power\} kW</p>\
          </div>\
                          )\}\
                        </div>\
              </div>\
            )\}\
          </div>\
        </div>\
              </div>\
            </motion.div>\
      )\}\
\
      \{step === 4 && (\
            <motion.div variants=\{fadeIn\} className="space-y-6 mt-12">\
              <h2 className="text-xl font-semibold text-white">\{translations.steps.battery\}</h2>\
        <div className="space-y-4">\
                    <Label htmlFor="batteryTime" className="text-lg font-semibold text-white">\{translations.fields.batteryTime\}</Label>\
            <Input\
              id="batteryTime"\
              name="batteryTime"\
              type="number"\
              placeholder="e.g., 15"\
              value=\{formData.batteryTime\}\
              onChange=\{handleChange\}\
                      className=\{`w-full p-3 bg-white/10 transition-all duration-200 border $\{\
                        errors.batteryTime ? 'border-red-500' : 'border-white/30'\
                      \} rounded-lg focus:ring-2 focus:ring-[#8AB73A] text-white placeholder-white/50 font-medium`\}\
                    />\
                    <ErrorMessage error=\{errors.batteryTime\} />\
          </div>\
            </motion.div>\
          )\}\
\
          \{step === 5 && batteryOptions.length > 0 && (\
            <motion.div variants=\{fadeIn\} className="space-y-6">\
              <h2 className="text-xl font-semibold text-white">\{translations.steps.battery\}</h2>\
              <div className="space-y-4">\
                    <h3 className="text-lg font-medium text-white">\uc0\u1055 \u1086 \u1076 \u1093 \u1086 \u1076 \u1103 \u1097 \u1072 \u1103  \u1082 \u1086 \u1085 \u1092 \u1080 \u1075 \u1091 \u1088 \u1072 \u1094 \u1080 \u1103  \u1073 \u1072 \u1090 \u1072 \u1088 \u1077 \u1081 :</h3>\
                \{batteryOptions.map((battery, i) => (\
                  <div \
                    key=\{i\} \
                    onClick=\{() => setSelectedBatteryIndex(i)\}\
                        className=\{`border-2 rounded-lg p-6 cursor-pointer transition-all duration-300 \
                      $\{selectedBatteryIndex === i \
                            ? 'border-[#8AB73A] bg-white/10 shadow-lg shadow-[#8AB73A]/20' \
                            : 'border-white/30 hover:border-white'\}`\}\
                  >\
                    <div className="grid gap-3">\
                      <div className="flex justify-between items-center">\
                            <span className="font-semibold text-white">\uc0\u1052 \u1086 \u1076 \u1077 \u1083 \u1100 :</span>\
                            <span className="text-white">\{battery.model\}</span>\
                      </div>\
                      <div className="flex justify-between items-center">\
                            <span className="font-semibold text-white">\uc0\u1045 \u1084 \u1082 \u1086 \u1089 \u1090 \u1100 :</span>\
                            <span className="text-white">\{battery.capacity_ah\} Ah</span>\
                      </div>\
                      <div className="flex justify-between items-center">\
                            <span className="font-semibold text-white">\uc0\u1069 \u1085 \u1077 \u1088 \u1075 \u1080 \u1103  \u1085 \u1072  \u1089 \u1090 \u1088 \u1086 \u1082 \u1091 :</span>\
                            <span className="text-white">\{battery.energy_per_string.toFixed(2)\} \uc0\u1082 \u1042 \u1090 \'b7\u1095 </span>\
                      </div>\
                      <div className="flex justify-between items-center">\
                            <span className="font-semibold text-white">\uc0\u1050 \u1086 \u1083 \u1080 \u1095 \u1077 \u1089 \u1090 \u1074 \u1086  \u1089 \u1090 \u1088 \u1086 \u1082 :</span>\
                            <span className="text-white">\{battery.strings_needed\}</span>\
                      </div>\
                      <div className="flex justify-between items-center">\
                            <span className="font-semibold text-white">\uc0\u1042 \u1089 \u1077 \u1075 \u1086  \u1073 \u1072 \u1090 \u1072 \u1088 \u1077 \u1081 :</span>\
                            <span className="text-white">\{battery.total_batteries\}</span>\
                      </div>\
                      <div className="flex justify-between items-center">\
                            <span className="font-semibold text-white">\uc0\u1054 \u1073 \u1097 \u1080 \u1081  \u1074 \u1077 \u1089 :</span>\
                            <span className="text-white">\{battery.total_weight_kg.toFixed(2)\} kg</span>\
                      </div>\
                      <div className="flex justify-between items-center">\
                            <span className="font-semibold text-white">\uc0\u1056 \u1072 \u1079 \u1084 \u1077 \u1088 \u1099 :</span>\
                            <span className="text-white">\{battery.dimensions\}</span>\
                      </div>\
                    </div>\
                    \{selectedBatteryIndex === i && (\
                      <div className="mt-4 flex justify-end">\
                            <div className="bg-[#8AB73A] text-white px-4 py-1.5 rounded-full text-sm font-medium shadow-lg shadow-[#8AB73A]/20">\
                          \uc0\u1042 \u1099 \u1073 \u1088 \u1072 \u1085 \u1086 \
          </div>\
        </div>\
                    )\}\
                  </div>\
                ))\}\
              </div>\
            </motion.div>\
          )\}\
\
          \{step === 6 && (\
            <motion.div variants=\{fadeIn\} className="space-y-6">\
                  <h2 className="text-2xl font-bold text-white mb-6">\{translations.steps.pdu\}</h2>\
              \
              <div className="space-y-8">\
                    <div className="bg-white/10 rounded-xl p-6 border border-white/20">\
                  <div className="space-y-4">\
                    <div>\
                          <Label className="text-lg font-semibold text-white">\{translations.fields.currentRating\}</Label>\
                      <div className="flex gap-4 mt-2">\
                        <label className="flex items-center space-x-2">\
                          <input\
                            type="radio"\
                            name="pduCurrent"\
                            value="16"\
                            checked=\{formData.pduCurrent === '16'\}\
                            onChange=\{handleChange\}\
                                className="h-4 w-4 text-[#8AB73A] focus:ring-[#8AB73A] cursor-pointer border-white/30"\
                          />\
                              <span className="text-white font-medium">16A</span>\
                        </label>\
                        <label className="flex items-center space-x-2">\
                          <input\
                            type="radio"\
                            name="pduCurrent"\
                            value="32"\
                            checked=\{formData.pduCurrent === '32'\}\
                            onChange=\{handleChange\}\
                                className="h-4 w-4 text-[#8AB73A] focus:ring-[#8AB73A] cursor-pointer border-white/30"\
                          />\
                              <span className="text-white font-medium">32A</span>\
                        </label>\
                      </div>\
                    </div>\
\
                    <div>\
                          <Label className="text-lg font-semibold text-white">\{translations.fields.phaseConfiguration\}</Label>\
                      <div className="flex gap-4 mt-2">\
                        <label className="flex items-center space-x-2">\
                          <input\
                            type="radio"\
                            name="pduPhase"\
                            value="1"\
                            checked=\{formData.pduPhase === '1'\}\
                            onChange=\{handleChange\}\
                                className="h-4 w-4 text-[#8AB73A] focus:ring-[#8AB73A] cursor-pointer border-white/30"\
                          />\
                              <span className="text-white font-medium">\{translations.fields.single\}</span>\
                        </label>\
                        <label className="flex items-center space-x-2">\
                          <input\
                            type="radio"\
                            name="pduPhase"\
                            value="3"\
                            checked=\{formData.pduPhase === '3'\}\
                            onChange=\{handleChange\}\
                                className="h-4 w-4 text-[#8AB73A] focus:ring-[#8AB73A] cursor-pointer border-white/30"\
                          />\
                              <span className="text-white font-medium">\{translations.fields.three\}</span>\
                        </label>\
                      </div>\
                    </div>\
\
                    <div>\
                          <Label className="text-lg font-semibold text-white">\{translations.fields.pduType\}</Label>\
                      <div className="flex gap-4 mt-2">\
                        \{['B', 'M', 'S'].map((type) => (\
                          <label key=\{type\} className="flex items-center space-x-2">\
                            <input\
                              type="radio"\
                              name="pduType"\
                              value=\{type\}\
                              checked=\{formData.pduType === type\}\
                              onChange=\{handleChange\}\
                                  className="h-4 w-4 text-[#8AB73A] focus:ring-[#8AB73A] cursor-pointer border-white/30"\
                            />\
                                <span className="text-white font-medium">\{translations.pduTypes[type as PDUType]\}</span>\
                          </label>\
                        ))\}\
                      </div>\
                    </div>\
                  </div>\
                </div>\
\
                    <div className="mt-8 bg-white/10 rounded-xl p-6 border border-white/20">\
                  <div className="flex items-start space-x-4">\
                    <input\
                      type="checkbox"\
                      id="distributionSystem"\
                      name="distributionSystem"\
                      checked=\{formData.distributionSystem === 'yes'\}\
                      onChange=\{(e) => \{\
                        handleChange(\{\
                          target: \{\
                            name: 'distributionSystem',\
                            value: e.target.checked ? 'yes' : 'no'\
                          \}\
                        \} as React.ChangeEvent<HTMLInputElement>);\
                      \}\}\
                          className="mt-1 h-5 w-5 rounded border-white/30 text-[#8AB73A] focus:ring-[#8AB73A] cursor-pointer"\
                    />\
                    <div className="flex-1">\
                          <label htmlFor="distributionSystem" className="text-lg font-semibold text-white block mb-2">\
                        \{_dataDist.name\}\
                      </label>\
                          <p className="text-white/70">\
                        \{_dataDist.type\}\
                      </p>\
                    </div>\
                  </div>\
                </div>\
              </div>\
            </motion.div>\
          )\}\
\
          \{step === 7 && (\
            <motion.div variants=\{fadeIn\} className="space-y-6">\
                  <h2 className="text-2xl font-bold text-white mb-6">\{translations.steps.monitoring\}</h2>\
              \
              <div className="space-y-8">\
                    <div className="bg-white/10 rounded-xl p-6 border border-white/20">\
                  <div className="flex items-start space-x-4">\
                    <input\
                      type="checkbox"\
                      id="monitoring"\
                      name="monitoring"\
                      checked=\{formData.monitoring\}\
                      onChange=\{handleChange\}\
                          className="mt-1 h-5 w-5 rounded border-white text-white focus:ring-2 focus:ring-white"\
                    />\
                    <div className="flex-1">\
                          <label htmlFor="monitoring" className="text-lg font-semibold text-white block mb-2">\
                        \{translations.fields.monitoringSystem\}\
                      </label>\
                          <div className="text-sm text-white/80 space-y-1">\
                        \{_dataMon.features.map((feature, index) => (\
                              <p key=\{index\} className="text-white/70 hover:text-white/90 transition-colors">\'95 \{feature\}</p>\
                        ))\}\
        </div>\
                    </div>\
                  </div>\
                </div>\
\
                    <div className="bg-white/10 rounded-xl p-6 border border-white/20">\
                  <div className="flex items-start space-x-4">\
                    <input\
                      type="checkbox"\
                      id="corridorIsolation"\
                      name="corridorIsolation"\
                      checked=\{formData.corridorIsolation\}\
                      onChange=\{handleChange\}\
                          className="mt-1 h-5 w-5 rounded border-white text-white focus:ring-2 focus:ring-white"\
                    />\
                    <div className="flex-1">\
                          <label htmlFor="corridorIsolation" className="text-lg font-semibold text-white block mb-2">\
                        \{translations.fields.corridorIsolation\}\
                      </label>\
                          <div className="text-sm text-white/80 space-y-1">\
                        \{_dataIso.features.map((feature, index) => (\
                              <p key=\{index\} className="text-white/70 hover:text-white/90 transition-colors">\'95 \{feature\}</p>\
                        ))\}\
                      </div>\
                    </div>\
                  </div>\
                </div>\
              </div>\
            </motion.div>\
      )\}\
\
      \{step > 7 && (\
                <motion.div variants=\{fadeIn\} className="space-y-8">\
                  <div className="bg-white/10 rounded-2xl shadow-lg space-y-8">\
                <div className="p-8">\
                      <h2 className="text-3xl font-bold text-white mb-8">\{translations.steps.summary\}</h2>\
                      \
                      \{(() => \{\
                        const itLoad = parseFloat(totalITLoad());\
                        const recommendedITUPS = getRecommendedITUPS(itLoad);\
                        const selectedAC = _dataAc.find(unit => unit.power.toString() === formData.acModel); // Use renamed variable\
                        const acUnitsCount = calculateACUnits();\
                        const recommendedACUPS = formData.backupCooling ? getRecommendedUPSForAC() : null;\
\
                        const costBreakdown: CostBreakdownItem[] = [];\
                        let totalCost = 0;\
\
                        // Add all the existing cost calculations\
                        // Racks Cost\
                        const racks600Count = parseInt(formData.racks600 || '0');\
                        const racks800Count = parseInt(formData.racks800 || '0');\
                        \
                        if (racks600Count > 0) \{\
                          costBreakdown.push(\{\
                            label: `$\{_dataRacks.R600.name\} ($\{racks600Count\}x)`,\
                            cost: racks600Count * _dataRacks.R600.price\
                          \});\
                          totalCost += racks600Count * _dataRacks.R600.price;\
                        \}\
\
                        if (racks800Count > 0) \{\
                          costBreakdown.push(\{\
                            label: `$\{_dataRacks.R800.name\} ($\{racks800Count\}x)`,\
                            cost: racks800Count * _dataRacks.R800.price\
                          \});\
                          totalCost += racks800Count * _dataRacks.R800.price;\
                        \}\
\
                        // IT UPS Cost\
                        costBreakdown.push(\{\
                          label: `IT UPS ($\{recommendedITUPS.model\})`,\
                          cost: recommendedITUPS.price\
                        \});\
                        totalCost += recommendedITUPS.price;\
\
                        // AC Units Cost\
                        if (selectedAC) \{\
                          const acCost = selectedAC.price * acUnitsCount;\
                          costBreakdown.push(\{\
                            label: `AC Units ($\{acUnitsCount\}x $\{selectedAC.model\})`,\
                            cost: acCost\
                          \});\
                          totalCost += acCost;\
                        \}\
\
                        // AC UPS Cost if backup is enabled\
                        if (formData.backupCooling && recommendedACUPS) \{\
                          costBreakdown.push(\{\
                            label: `AC UPS ($\{recommendedACUPS.model\})`,\
                            cost: recommendedACUPS.price\
                          \});\
                          totalCost += recommendedACUPS.price;\
                        \}\
\
                        // PDU Cost\
                        const totalPDUCost = calculateTotalPDUCost();\
                        if (totalPDUCost > 0) \{\
                          const pduTypeLabel = translations.pduTypes[formData.pduType as PDUType];\
                          costBreakdown.push(\{\
                            label: `PDU ($\{pduTypeLabel\} $\{formData.pduCurrent\}A)`,\
                            cost: totalPDUCost\
                          \});\
                          totalCost += totalPDUCost;\
                        \}\
\
                        // Battery Cost\
                        if (batteryOptions.length > 0 && selectedBatteryIndex >= 0) \{\
                          const selectedBattery = batteryOptions[selectedBatteryIndex];\
                          costBreakdown.push(\{\
                            label: `\uc0\u1041 \u1072 \u1090 \u1072 \u1088 \u1077 \u1080  ($\{selectedBattery.model\})`,\
                            cost: selectedBattery.total_price\
                          \});\
                          totalCost += selectedBattery.total_price;\
                        \}\
\
                        // Add monitoring system cost if selected\
                        if (formData.monitoring) \{\
                          costBreakdown.push(\{\
                            label: translations.fields.monitoringSystem,\
                            cost: _dataMon.price\
                          \}); // Use renamed variable\
                          totalCost += _dataMon.price;\
                        \}\
\
                        // Add corridor isolation cost if selected\
                        if (formData.corridorIsolation) \{\
                          costBreakdown.push(\{\
                            label: translations.fields.corridorIsolation,\
                            cost: _dataIso.price\
                          \}); // Use renamed variable\
                          totalCost += _dataIso.price;\
                        \}\
\
                        // Add power distribution system cost if selected\
                        if (formData.distributionSystem === 'yes') \{\
                          costBreakdown.push(\{\
                            label: _dataDist.name,\
                            cost: _dataDist.price\
                          \}); // Use renamed variable\
                          totalCost += _dataDist.price;\
                        \}\
\
                        return (\
                          <div className="space-y-6">\
                            <div className="bg-gradient-to-r from-white/10 to-white/20 rounded-lg p-6 space-y-4">\
                              \{costBreakdown.map((item, index) => (\
                                <div key=\{index\} className="flex justify-between items-center py-2 border-b border-white/20 last:border-0">\
                                  <span className="text-white/80">\{item.label\}</span>\
                                  <span className="font-medium text-white">\{item.cost.toLocaleString('en-US', \{ style: 'currency', currency: 'USD' \})\}</span>\
              </div>\
                              ))\}\
            </div>\
                            <div className="bg-gradient-to-r from-white/20 to-white/30 rounded-lg p-6">\
                              <div className="flex justify-between items-center">\
                                <span className="text-xl font-semibold text-white">\{translations.fields.totalCost\}</span>\
                                <span className="text-2xl font-bold bg-gradient-to-r from-white to-white bg-clip-text text-transparent">\
                                  \{totalCost.toLocaleString('en-US', \{ style: 'currency', currency: 'USD' \})\}\
                                </span>\
                              </div>\
                            </div>\
                          </div>\
                        );\
                      \})()\}\
                </div>\
              </div>\
            </motion.div>\
          )\}\
            </div>\
\
            \{/* Navigation buttons */\}\
            <div className="flex justify-between mt-6 md:mt-8">\
          \{step > 0 ? (\
            <Button\
              onClick=\{handleBack\}\
              className="bg-[#1e88e5]/20 hover:bg-[#1e88e5]/30 text-white border border-[#1e88e5]/50 px-4 md:px-8 py-2 md:py-3 rounded-xl font-semibold transition-all backdrop-blur-sm text-sm md:text-base"\
            >\
              \{translations.buttons.back\}\
            </Button>\
          ) : (\
            <div /> \
          )\}\
\
            <div className="flex space-x-4">\
            \{step > 7 && (\
              <>\
                \{/* Add the new Return to Site button here */\}\
                <Button\
                  onClick=\{() => navigate('/dashboard')\} \
                  className="bg-[#8AB73A]/90 hover:bg-[#8AB73A] text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-semibold transition-all shadow-lg shadow-[#8AB73A]/20 backdrop-blur-sm text-sm md:text-base"\
                >\
                  \uc0\u1042 \u1077 \u1088 \u1085 \u1091 \u1090 \u1100 \u1089 \u1103  \u1074  \u1083 \u1080 \u1095 \u1085 \u1099 \u1081  \u1082 \u1072 \u1073 \u1080 \u1085 \u1077 \u1090 \
                </Button>\
              <Button\
                onClick=\{generatePDF\}\
                className="bg-[#1e88e5]/90 hover:bg-[#1e88e5] text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-semibold transition-all shadow-lg shadow-[#1e88e5]/20 backdrop-blur-sm text-sm md:text-base flex items-center space-x-2"\
              >\
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">\
                  <path d="M12 10v6m0 0l-3-3m3 3l3-3M3 17v3a2 2 0 002 2h14a2 2 0 002-2v-3M14 3H8a2 2 0 00-2 2v5m12 0V5a2 2 0 00-2-2h-2m-4 8h8" />\
                </svg>\
                <span>\{translations.buttons.downloadPdf\}</span>\
              </Button>\
              </>\
            )\}\
            \{step < 8 && (\
            <Button\
              onClick=\{handleNext\}\
                className="bg-[#8AB73A]/90 hover:bg-[#8AB73A] text-white px-4 md:px-8 py-2 md:py-3 rounded-xl font-semibold transition-all shadow-lg shadow-[#8AB73A]/20 backdrop-blur-sm text-sm md:text-base"\
            >\
              \{translations.buttons.next\}\
            </Button>\
          )\}\
          </div>\
            </div>\
      </motion.div>\
        </div>\
      </div>\
    </div>\
  );\
\}}