import { useState } from "react";
import * as api from "../api";
import ggdrive from "@assets/ggdrive.svg";

const Login = ({ setAuth, setUsername }) => {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);

    const handleSignIn = async () => {
        setStatus("loading");
        setError(null);
        try {
            const result = await api.signIn();
            console.log("Rclone token:", result.token);
            const name = await api.getGDUserName();
            if (name) {
                console.log("Google Drive user:", name);
                setUsername(name);
                setStatus("success");
                setAuth(true);
            } else {
                throw new Error("Failed to fetch username after sign-in");
            }
        } catch (err) {
            console.error(err);
            setError(err.toString() || "An error occurred during sign-in");
            setStatus("error");
            setAuth(false);
        }
    };

    return (
        <div>
            <div className="flex h-screen flex-col justify-center px-6 py-12 lg:px-8 dark:bg-gray-900">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                    <img
                        className="mx-auto h-16 w-auto"
                        src={ggdrive}
                        alt="GG Drive Logo"
                    />
                    <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900 dark:text-white">
                        Sign in to your Google Drive Account
                    </h2>
                </div>

                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                    <button
                        onClick={handleSignIn}
                        disabled={status === "loading"}
                        className="flex w-full cursor-pointer justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                    >
                        Sign in
                    </button>
                </div>
                {status === "success" && (
                    <p className="mt-10 text-center text-green-600 dark:text-green-400">
                        Sign in successfully!
                    </p>
                )}
                {status === "error" && (
                    <p className="mt-10 text-center text-red-600 dark:text-red-400">
                        Failed to sign in: {error}
                    </p>
                )}
            </div>
        </div>
    );
};

export default Login;
