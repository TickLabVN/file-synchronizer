# File Synchronizer

A cross-platform desktop application built with ElectronJS, ReactJS, and TailwindCSS for synchronizing files with Google Drive.

> **Note:** Because the backend server is deployed on Render, the first login may take a few seconds while the server starts up. Please wait for the loading indicator before proceeding.

## Features

- Cross-platform support (Windows, macOS, Linux)
- Seamless file synchronization with Google Drive
- Real-time updates and conflict resolution
- User-friendly interface built with React and styled using TailwindCSS

## Prerequisites

- Node.js
- npm
- A Google Cloud Platform account

## Installation

1. **Clone the repository**:

    ```bash
    git clone https://github.com/BaoDuong254/file-synchronizer.git
    cd file-synchronizer
    ```

2. **Install backend dependencies**:

    ```bash
    cd backend
    npm install
    ```

3. **Install frontend and Electron dependencies**:

    ```bash
    cd ../
    npm install
    ```

## Configuration

1. **Copy the example environment file**:

    ```bash
    cp .env.example .env
    ```

2. **Edit `.env` and set the following variables**:

    - `GOOGLE_CLIENT_ID`
    - `GOOGLE_CLIENT_SECRET`
    - `BACKEND_URL`

3. **Setup credentials in Google Cloud Platform**:

    - Create or select a project
    - Enable the Google Drive API and OAuth2
    - Create OAuth2 credentials for a **Web Application**
    - Copy the **Client ID** and **Client Secret** into your `.env`

## Running the Application

1. **Start the backend server**:

    ```bash
    npm run server
    ```

2. **Start the Electron app (in a separate terminal)**:

    ```bash
    npm run dev
    ```

3. **Login and sync**:

    - The Electron window will open
    - Sign in with your Google account
    - Choose folders to synchronize

## Contributing

We welcome contributions! To contribute:

1. **Fork the repository**
2. **Create a branch for your feature or fix:**

    ```bash
    git checkout -b feature/your-feature-name
    ```

3. **Make your changes and commit:**

    ```bash
    git commit -m "Add feature X"
    ```

4. **Push to your branch:**

    ```bash
    git push origin feature/your-feature-name
    ```

5. **Open a Pull Request on GitHub and describe your changes.**

## Reporting Issues

If you encounter any bugs or errors, please open an issue on GitHub and include:

- Steps to reproduce the problem
- Expected vs. actual behavior
- Relevant logs or error messages

---

> **Note:** This application is currently in beta. If you find any issues or have suggestions for improvements, please report them or contribute via pull requests. We appreciate your feedback!
