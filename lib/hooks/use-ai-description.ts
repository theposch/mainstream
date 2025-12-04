"use client";

import { useState, useCallback } from "react";

interface UseAIDescriptionOptions {
  onSuccess?: (description: string) => void;
  onError?: (error: string) => void;
}

interface UseAIDescriptionReturn {
  /** Generate a description. Pass existingDescription to enhance rather than replace. */
  generate: (imageUrl: string, existingDescription?: string) => Promise<void>;
  isGenerating: boolean;
  error: string | null;
  clearError: () => void;
}

/**
 * Hook for generating AI descriptions for images
 * 
 * @example
 * const { generate, isGenerating, error } = useAIDescription({
 *   onSuccess: (description) => setDescription(description),
 * });
 * 
 * // Generate fresh description
 * await generate(imageUrl);
 * 
 * // Enhance existing description
 * await generate(imageUrl, currentDescription);
 */
export function useAIDescription(
  options: UseAIDescriptionOptions = {}
): UseAIDescriptionReturn {
  const { onSuccess, onError } = options;
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generate = useCallback(
    async (imageUrl: string, existingDescription?: string) => {
      if (!imageUrl) {
        const errorMsg = "No image URL provided";
        setError(errorMsg);
        onError?.(errorMsg);
        return;
      }

      setIsGenerating(true);
      setError(null);

      try {
        const response = await fetch("/api/ai/describe", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            imageUrl,
            existingDescription: existingDescription?.trim() || undefined,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to generate description");
        }

        if (data.description) {
          onSuccess?.(data.description);
        } else {
          throw new Error("No description returned");
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Failed to generate description";
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsGenerating(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    generate,
    isGenerating,
    error,
    clearError,
  };
}

