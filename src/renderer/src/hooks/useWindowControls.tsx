import { useEffect, useState } from "react";

declare global {
    interface Window {
        windowControls: {
            isMaximized: () => Promise<boolean>;
            minimize: () => void;
            maximize: () => void;
            close: () => void;
        };
    }
}

const useWindowControls = (): {
    isMax: boolean;
    onMin: () => void;
    onMax: () => void;
    onClose: () => void;
} => {
    const [isMax, setIsMax] = useState(false);

    useEffect(() => {
        window.windowControls.isMaximized().then(setIsMax);
    }, []);

    const onMin = (): void => window.windowControls.minimize();
    const onMax = (): void => {
        window.windowControls.maximize();
        setIsMax((prev) => !prev);
    };
    const onClose = (): void => {
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
