# Sandesh WAP - Browser-Based Development Environment

## Overview

Sandesh WAP is a modern web application platform that provides a complete browser-based development environment. It combines Monaco Editor for code editing, xterm.js for terminal functionality, and a comprehensive file system management interface. The application is designed to offer a VS Code-like experience in the browser, with features including live coding, integrated terminal access, project management, collaborative development capabilities, and AI-powered assistance.

The platform is built as a full-stack application with a React frontend and Express.js backend, specifically optimized for deployment on Replit with potential for scaling to Kubernetes environments.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### September 11, 2025
- Renamed application from "Fanz Devspaces" to "Sandesh WAP"
- Added Templates Catalog with starter projects (Node.js, FastAPI, Next.js)
- Integrated AI helpers using OpenAI API:
  - Command dry-run explanations with risk analysis
  - Automatic Dockerfile generation
  - Log analysis with error detection and fix suggestions
- Implemented collaborative sharing with viewer/editor roles and invite links
- Applied professional UI polish with purple gradient theme
- Enhanced glass morphism effects and smooth animations
- Fixed WebSocket communication for terminal integration

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development practices
- **UI Library**: Comprehensive component system built on Radix UI primitives with custom styling
- **Styling**: Tailwind CSS with custom design tokens and responsive design patterns
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Code Editor**: Monaco Editor integration providing VS Code-like editing experience with syntax highlighting
- **Terminal**: xterm.js with fit addon for browser-based terminal functionality
- **Routing**: Wouter for lightweight client-side routing
- **Build System**: Vite for fast development and optimized production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules for modern JavaScript features
- **API Design**: RESTful endpoints with WebSocket support for real-time terminal communication
- **File System**: Custom file system service with security sandboxing and event-driven file watching
- **PTY Integration**: node-pty for spawning and managing shell processes
- **Session Management**: Express sessions with PostgreSQL storage
- **Development Server**: Hot module replacement and development middleware integration

### Data Storage Solutions
- **Database**: PostgreSQL with Neon serverless for scalable data storage
- **ORM**: Drizzle ORM for type-safe database operations and migrations
- **Schema Design**: Structured tables for users, files, and project metadata
- **Caching**: In-memory storage service for development with database fallback
- **File Storage**: Direct file system access with path validation and security constraints

### Authentication and Authorization
- **Session-Based**: Traditional session management with secure cookie storage
- **User Management**: Basic username/password authentication system
- **Security**: Path validation to prevent directory traversal attacks
- **Authorization**: File access control based on project ownership and permissions

### Real-Time Communication
- **WebSocket Server**: Native WebSocket implementation for terminal communication
- **PTY Integration**: Bidirectional communication between browser terminal and server processes
- **Event Handling**: Real-time file system events and terminal I/O streaming
- **Connection Management**: Automatic reconnection and session persistence

## Key Features

### IDE Capabilities
- **Monaco Editor**: Full-featured code editor with syntax highlighting, IntelliSense, and multi-tab support
- **Live Terminal**: Real-time terminal with PTY backend for executing commands
- **File Explorer**: Tree-view file browser with create, rename, delete operations
- **Auto-save**: Automatic saving of file changes with visual indicators
- **Theme System**: 7 pre-built themes including VSCode Dark, Light, Monokai, and more

### AI-Powered Assistance
- **Command Analysis**: Dry-run command explanations with risk assessment before execution
- **Dockerfile Generation**: Automatic creation of optimized Dockerfiles based on project analysis
- **Log Analysis**: Intelligent error detection and fix suggestions from terminal output
- **Rate Limiting**: IP-based rate limiting for AI features (10 requests per minute)

### Templates & Starter Projects
- **Node.js Template**: Express server with basic routing setup
- **FastAPI Template**: Python API with automatic documentation
- **Next.js Template**: Full-stack React application with server-side rendering
- **Auto-cloning**: Templates automatically clone to `/projects/<id>` directories

### Collaboration Features
- **Share Links**: Generate invite links with viewer or editor permissions
- **Role-based Access**: Viewer role for read-only access, Editor role for full edit capabilities
- **Real-time Sync**: Leverages Replit's native collaboration for real-time code sharing

## External Dependencies

### Core Development Tools
- **Monaco Editor**: Microsoft's code editor powering VS Code, providing syntax highlighting and IntelliSense
- **xterm.js**: Terminal emulator for web browsers with full feature support
- **node-pty**: Node.js library for spawning pseudoterminals and managing shell processes

### Database and ORM
- **Neon Database**: Serverless PostgreSQL database with branching capabilities
- **Drizzle ORM**: TypeScript-first ORM with compile-time query validation
- **Drizzle Kit**: Database migration and introspection toolkit

### UI and Styling
- **Radix UI**: Unstyled, accessible UI components for React applications
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development
- **Framer Motion**: Animation library for smooth transitions and micro-interactions
- **Lucide React**: Icon library with consistent design system

### Build and Development
- **Vite**: Fast build tool with hot module replacement and optimized bundling
- **TypeScript**: Static type checking and enhanced developer experience
- **PostCSS**: CSS processing with autoprefixer for browser compatibility

### Hosting and Deployment
- **Replit Integration**: Optimized for Replit development environment with custom configurations
- **Environment Detection**: Automatic detection of Replit environment for enhanced features
- **Development Tooling**: Replit-specific plugins for better development experience

### Utilities and Libraries
- **TanStack Query**: Powerful data synchronization for React applications
- **React Hook Form**: Performant forms with easy validation
- **Zod**: Schema validation for runtime type checking
- **class-variance-authority**: Utility for creating consistent component variants

### AI Integration
- **OpenAI API**: GPT model integration for command analysis, Dockerfile generation, and log analysis
- **Rate Limiting**: Built-in request throttling to prevent API abuse
- **Secure Key Management**: Environment variable storage for API keys