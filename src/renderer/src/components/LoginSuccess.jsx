import LoginIcon from "@assets/icon.png";
import { useState } from "react";

const LoginSuccess = ({ setUsername }) => {
    const [usernameInput, setUsernameInput] = useState("");

    const handleChange = (e) => {
        setUsernameInput(e.target.value);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const trimmed = usernameInput.trim();
        if (trimmed) {
            setUsername(trimmed);
        } else {
            alert("Please enter a valid username.");
        }
    };

    return (
        <div>
            <div className="flex min-h-full flex-col justify-center px-6 py-12 lg:px-8">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                    <img
                        className="mx-auto h-10 w-auto"
                        src={LoginIcon}
                        alt="Your Company"
                    />
                    <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-green-600">
                        Sign in successfully!
                    </h2>
                </div>

                <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
                    <form
                        className="space-y-6"
                        action="#"
                        method="POST"
                        onSubmit={handleSubmit}
                    >
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm/6 font-medium text-gray-900"
                            >
                                Username
                            </label>
                            <div className="mt-2">
                                <input
                                    type="text"
                                    name="username"
                                    required
                                    placeholder="Enter your username"
                                    id="username"
                                    value={usernameInput}
                                    onChange={handleChange}
                                    className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                className="flex w-full cursor-pointer justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-xs hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
                            >
                                Continue
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default LoginSuccess;
