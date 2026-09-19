"use client";

import Icon from "./Icon";

export default function VoiceMicrophoneButton({
  label,
  onClick,
  className = "",
}: {
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      data-demo-ready="true"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`story-mic-button flex items-center justify-center ${className}`.trim()}
    >
      <Icon i="mic" size={20} />
    </button>
  );
}
