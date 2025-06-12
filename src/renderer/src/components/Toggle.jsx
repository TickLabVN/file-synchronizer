const Toggle = ({ label, checked, onChange }) => {
    return (
        <div className="flex items-center justify-between">
            <span className="text-gray-800 dark:text-gray-200">{label}</span>
            <label className="relative inline-flex cursor-pointer items-center">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    className="peer sr-only"
                />
                <div className="h-6 w-11 rounded-full bg-gray-200 peer-checked:bg-blue-600 peer-focus:ring-2 peer-focus:ring-blue-300 dark:bg-gray-700 dark:peer-focus:ring-blue-500"></div>
                <div className="absolute top-1 left-1 h-4 w-4 rounded-full border border-gray-300 bg-white transition-transform peer-checked:translate-x-5 dark:bg-gray-200"></div>
            </label>
        </div>
    );
};

export default Toggle;
