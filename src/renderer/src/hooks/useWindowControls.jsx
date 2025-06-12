import { useEffect, useState } from "react";

const useWindowControls = () => {
    const [isMax, setIsMax] = useState(false);

    useEffect(() => {
        window.windowControls.isMaximized().then(setIsMax);
    }, []);

    const onMin = () => window.windowControls.minimize();
    const onMax = () => {
        window.windowControls.maximize();
        setIsMax((prev) => !prev);
    };
    const onClose = () => {
        window.confirm("Do you want to close the application") &&
            window.windowControls.close();
    };

    return {
        isMax,
        onMin,
        onMax,
        onClose,
    };
};

export default useWindowControls;
