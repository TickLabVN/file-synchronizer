import { useState } from "react";
import * as api from "../api";

const Login = ({ providerList, onSuccess }) => {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);

    const handleSignIn = async (id) => {
        setStatus("loading");
        setError(null);
        try {
            const result =
                id === "google" ? await api.signIn() : await api.boxSignIn();
            console.log("Cloud token:", result.token);
            const name =
                id === "google"
                    ? await api.getGDUserName()
                    : await api.getBoxUserName();
            if (name) {
                console.log("Google Drive user:", name);
                onSuccess(id, name);
                setStatus("success");
            } else {
                throw new Error("Failed to fetch username after sign-in");
            }
        } catch (err) {
            console.error(err);
            setError(err.toString() || "An error occurred during sign-in");
            setStatus("error");
        }
    };

    return (
        <div className="w-80 rounded-lg bg-white p-6">
            <h2 className="mb-4 text-xl">Sign in to cloud</h2>
            <ul className="space-y-3">
                {providerList.map(({ id, label, icon }) => (
                    <li key={id}>
                        <button
                            onClick={() => handleSignIn(id)}
                            disabled={status === "loading"}
                            className="flex w-full cursor-pointer items-center rounded border px-4 py-2 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <img
                                src={icon}
                                alt={`${label} icon`}
                                className="mr-2 h-6 w-6"
                            />
                            <span>{label}</span>
                        </button>
                    </li>
                ))}
            </ul>
            {status === "error" && (
                <p className="mt-2 text-red-500">Error: {error}</p>
            )}
        </div>
    );
};

export default Login;
