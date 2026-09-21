"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

type SpeechRecognitionEventLike = Event & {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
};

type SpeechRecognitionErrorEventLike = Event & { error: string };

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function recognitionConstructor() {
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export default function VoiceMicrophoneButton({
  label,
  value,
  onTranscript,
  onMessage,
  language = "fr-FR",
  className = "",
}: {
  label: string;
  value: string;
  onTranscript: (value: string) => void;
  onMessage: (message: string) => void;
  language?: string;
  className?: string;
}) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const [isListening, setIsListening] = useState(false);

  useEffect(
    () => () => {
      recognitionRef.current?.abort();
    },
    [],
  );

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      return;
    }

    const Recognition = recognitionConstructor();
    if (!Recognition) {
      onMessage("La transcription vocale n’est pas prise en charge par ce navigateur. Essaie Chrome ou Safari.");
      return;
    }

    const recognition = new Recognition();
    const initialValue = value.trim();
    let finalTranscript = "";
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;
    recognition.onresult = (event) => {
      let interimTranscript = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript?.trim() ?? "";
        if (event.results[index].isFinal) finalTranscript = `${finalTranscript} ${transcript}`.trim();
        else interimTranscript = `${interimTranscript} ${transcript}`.trim();
      }
      onTranscript([initialValue, finalTranscript, interimTranscript].filter(Boolean).join(" "));
    };
    recognition.onerror = (event) => {
      const message =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Autorise le microphone dans les réglages du navigateur, puis réessaie."
          : event.error === "no-speech"
            ? "Aucune parole détectée. Rapproche-toi du microphone et réessaie."
            : "La transcription vocale a été interrompue. Réessaie dans un instant.";
      onMessage(message);
      setIsListening(false);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      onMessage("Le microphone est déjà utilisé. Arrête l’écoute puis réessaie.");
    }
  };

  return (
    <button
      type="button"
      data-demo-ready="true"
      onClick={toggleListening}
      aria-label={isListening ? "Arrêter la transcription" : label}
      aria-pressed={isListening}
      title={isListening ? "Arrêter la transcription" : label}
      className={`story-mic-button flex items-center justify-center ${isListening ? "is-listening" : ""} ${className}`.trim()}
    >
      <Icon i="mic" size={20} />
      <span className="sr-only" aria-live="polite">
        {isListening ? "Microphone actif, parle maintenant." : "Microphone inactif."}
      </span>
    </button>
  );
}
