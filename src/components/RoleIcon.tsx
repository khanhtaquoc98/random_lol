import React from "react";
import { RoleId } from "@/data/champions";

interface RoleIconProps {
  role: RoleId;
  className?: string;
}

export function RoleIcon({ role, className = "w-5 h-5" }: RoleIconProps) {
  switch (role) {
    case "TOP":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          {/* Outer Top-Left Lane Highlight */}
          <path
            d="M3 3H19L15.5 6.5H6.5V15.5L3 19V3Z"
            fill="currentColor"
          />
          {/* Inner Center Diamond */}
          <rect
            x="9.5"
            y="9.5"
            width="5"
            height="5"
            fill="currentColor"
            fillOpacity="0.35"
          />
          {/* Faded Bottom-Right Lane */}
          <path
            d="M21 21H5L8.5 17.5H17.5V8.5L21 5V21Z"
            fill="currentColor"
            fillOpacity="0.22"
          />
        </svg>
      );
    case "JG":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 2C9.5 6 7.5 9.5 8.5 14C6 11.5 4 9.5 3 6C2.5 11.5 5 16.5 9.5 19.5L12 22L14.5 19.5C19 16.5 21.5 11.5 21 6C20 9.5 18 11.5 15.5 14C16.5 9.5 14.5 6 12 2Z"
            fill="currentColor"
          />
        </svg>
      );
    case "MID":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          {/* Top-Left faded corner */}
          <path
            d="M3 3H14L11 6H6V11L3 14V3Z"
            fill="currentColor"
            fillOpacity="0.25"
          />
          {/* Diagonal Mid Lane active */}
          <path
            d="M18.5 3H21V5.5L5.5 21H3V18.5L18.5 3Z"
            fill="currentColor"
          />
          {/* Bottom-Right faded corner */}
          <path
            d="M21 21H10L13 18H18V13L21 10V21Z"
            fill="currentColor"
            fillOpacity="0.25"
          />
        </svg>
      );
    case "AD":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          {/* Faded Top-Left Lane */}
          <path
            d="M3 3H19L15.5 6.5H6.5V15.5L3 19V3Z"
            fill="currentColor"
            fillOpacity="0.22"
          />
          {/* Inner Center Diamond */}
          <rect
            x="9.5"
            y="9.5"
            width="5"
            height="5"
            fill="currentColor"
            fillOpacity="0.35"
          />
          {/* Active Bottom-Right Bot Lane */}
          <path
            d="M21 21H5L8.5 17.5H17.5V8.5L21 5V21Z"
            fill="currentColor"
          />
        </svg>
      );
    case "SP":
      return (
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
          <path
            d="M12 3L15.5 7.5L21 8.5L16.5 12.5L18 19L12 15.5L6 19L7.5 12.5L3 8.5L8.5 7.5L12 3Z"
            fill="currentColor"
          />
        </svg>
      );
  }
}
