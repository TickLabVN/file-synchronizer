import { FileIcon, defaultStyles } from "react-file-icon";
import { File as GenericIcon } from "lucide-react";

export default function FileExtIcon({ path, size = 16 }) {
    const ext = (path.split(".").pop() || "").toLowerCase();
    if (ext && defaultStyles[ext]) {
        return (
            <div style={{ width: size, height: size }}>
                <FileIcon extension={ext} {...defaultStyles[ext]} />
            </div>
        );
    }
    return <GenericIcon className="text-yellow-500" size={size} />;
}
