# WalkieTalkie

A mobile workforce management platform that enables real-time communication, location tracking, and administrative oversight for distributed employee teams.

## 📋 Overview

WalkieTalkie is a cross-platform mobile application designed to streamline employee management and team communication. It provides separate interfaces for employees and administrators, with features including:

- **Employee Portal**: Dashboard, real-time chat, contact management, site tracking, activity logs, and profile management
- **Admin Dashboard**: Company management, employee oversight, contact management, activity monitoring, site management, and system settings
- **Real-time Communication**: In-app messaging and notifications
- **Location Services**: Map-based site viewing and location tracking
- **Authentication**: Secure user registration and sign-in
- **Data Management**: Centralized employee and company records

## 🏗️ Architecture

The application follows a client-server architecture with:

- **Frontend**: Native mobile application with web support
- **Backend**: Supabase (PostgreSQL database with authentication)
- **Authentication**: Email/phone-based user authentication via Supabase

## 🛠️ Tech Stack

### Core Framework & Runtime

- **React Native** (0.81.5) - Cross-platform mobile development
- **Expo** (54.0.0) - Managed React Native development and deployment
- **React** (19.1.0) - UI component library
- **TypeScript** (~5.9.2) - Static type checking

### Styling & UI

- **NativeWind** (4.2.1) - Tailwind CSS for React Native
- **Tailwind CSS** (3.4.19) - Utility-first CSS framework
- **Expo Vector Icons** (^15.0.3) - Icon library

### Navigation

- **React Navigation** (7.1.28) - React Native navigation
- **React Navigation Native Stack** (7.12.0) - Native stack navigator

### Backend & Data

- **Supabase JS** (^2.95.3) - Backend-as-a-Service with PostgreSQL
- **Async Storage** (^2.2.0) - Client-side data persistence

### Specialized Features

- **Expo Speech Recognition** (3.1.0) - Voice input capabilities
- **Expo Image Picker** (^17.0.10) - Image selection from device
- **Expo Image Manipulator** (^14.0.8) - Image processing
- **React Native WebView** (^13.15.0) - Web content rendering
- **React Native Reanimated** (~4.1.1) - Advanced animations
- **React Native Safe Area Context** (~5.6.0) - Safe area handling
- **React Native Screens** (~4.16.0) - Native screen support
- **React Native Worklets** (0.5.1) - Worklet support for animations

### UI Components & Alerts

- **React Native Sweet Alert** (^3.5.0) - Modal alerts
- **React Native Simple Toast** (^3.3.2) - Toast notifications
- **React Native Alert Dialog** (^0.1.1) - Alert dialogs

### Development Tools

- **Babel** (^7.20.0) - JavaScript transpiler
- **ESLint** (^9.25.1) - Code linting
- **Prettier** (^3.2.5) - Code formatting
- **Prettier Plugin Tailwind CSS** (^0.5.14) - Tailwind class sorting

### Configuration Files

- **tsconfig.json** - TypeScript configuration
- **tailwind.config.js** - Tailwind CSS configuration
- **babel.config.js** - Babel configuration
- **metro.config.js** - Metro bundler configuration
- **eslint.config.js** - ESLint configuration
- **prettier.config.js** - Prettier configuration

## 📁 Project Structure

```
walkietalkie/
├── pages/                          # Application pages/screens
│   ├── SignIn.tsx                 # User authentication
│   ├── SignUp.tsx                 # User registration
│   ├── admin/                      # Admin dashboard pages
│   │   ├── ActivityLogs.tsx        # User activity monitoring
│   │   ├── CompanyList.tsx         # Company management
│   │   ├── ContactManagement.tsx   # Admin contact directory
│   │   ├── Dashboard.tsx           # Admin main dashboard
│   │   ├── Employees.tsx           # Employee management
│   │   ├── Settings.tsx            # Admin settings
│   │   └── SiteManagement.tsx      # Site administration
│   └── employee/                   # Employee portal pages
│       ├── Chat.tsx                # Real-time messaging
│       ├── Contacts.tsx            # Contact directory
│       ├── Dashboard.tsx            # Employee main dashboard
│       ├── EditProfile.tsx          # Profile management
│       ├── Logs.tsx                 # Activity logs view
│       ├── Map.tsx                  # Site location view
│       └── Settings.tsx             # Employee settings
├── components/                      # Reusable React components
│   ├── AdminNavbar.tsx             # Admin navigation
│   ├── Navbar.tsx                  # Employee navigation
│   ├── Container.tsx               # Layout container
│   ├── ScreenContent.tsx            # Screen content wrapper
│   ├── EditScreenInfo.tsx           # Screen info editing
│   ├── SweetAlertModal.tsx          # Alert modal
│   └── EulaModal.tsx                # EULA agreement modal
├── utils/                           # Utility functions
│   ├── supabase.tsx                # Supabase client & API calls
│   └── eula.tsx                     # EULA management
├── assets/                          # Application assets
├── App.tsx                          # Application entry point
├── app.json                         # Expo app configuration
├── global.css                       # Global styles
├── tailwind.config.js               # Tailwind configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Project dependencies

```

## 🚀 Getting Started

### Prerequisites

- Node.js (LTS recommended)
- Yarn or npm
- Expo CLI

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm start
   ```

3. Run on a specific platform:
   ```bash
   npm run android    # Android emulator
   npm run ios        # iOS simulator
   npm run web        # Web browser
   ```

## 📋 Available Scripts

- `npm start` - Start Expo development server
- `npm run android` - Build and run on Android emulator
- `npm run ios` - Build and run on iOS simulator
- `npm run web` - Run web version
- `npm run lint` - Run ESLint and Prettier checks
- `npm run format` - Fix linting and formatting issues
- `npm run prebuild` - Prebuild native binaries with Expo

## 🔐 Authentication & Security

- User authentication via Supabase
- Role-based access control (Admin/Employee)
- End-user license agreement (EULA) acceptance required
- Session management with AsyncStorage

## 🗄️ Database

The application uses **Supabase** with PostgreSQL for:

- User account management
- Employee and company data
- Sites and location information
- Activity logs
- Chat messages
- Contact information

## 🎨 UI/UX Features

- Responsive design for mobile and tablet
- Dark/Light mode support
- Tailwind CSS utility-first styling
- Smooth animations with React Native Reanimated
- Toast notifications and modal alerts
- Safe area handling for notched devices

## 📱 Platform Support

- **Android** (via Expo)
- **iOS** (via Expo)
- **Web** (via React Native Web)

## 🔧 Development Workflow

1. **Code Quality**: ESLint + Prettier
2. **Type Safety**: TypeScript strict mode
3. **Responsive Design**: NativeWind/Tailwind CSS
4. **State Management**: React hooks with AsyncStorage

## 📞 Features Summary

### Employee Features

- Personal dashboard
- Real-time chat with colleagues
- Contact directory
- View assigned sites on map
- Activity logs
- Profile settings and editing
- Image upload and manipulation

### Admin Features

- Comprehensive employee management
- Company data administration
- Site management
- View employee activity logs
- Contact management
- System settings
- Analytics and monitoring
