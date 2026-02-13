import React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    fluid?: boolean;
}

export const Container = React.forwardRef<HTMLDivElement, ContainerProps>(
    ({ className, fluid, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "w-full px-4 md:px-6 mx-auto",
                    !fluid && "max-w-[1400px]",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Container.displayName = "Container";
