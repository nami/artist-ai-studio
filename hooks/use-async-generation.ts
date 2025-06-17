// hooks/use-async-generation.ts
import { useState, useCallback, useRef } from 'react';

interface Generation {
  id: string;
  status: 'generating' | 'completed' | 'failed';
  imageUrl?: string;
  prompt: string;
  error?: string;
  estimatedTime?: string;
}

export function useAsyncGeneration() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const pollTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const startGeneration = useCallback(async (params: {
    prompt: string;
    modelId?: string;
    userId: string;
    steps?: number;
    guidance?: number;
    seed?: number;
  }) => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start generation');
      }

      const result = await response.json();
      
      // Add to generations list
      const newGeneration: Generation = {
        id: result.generationId,
        status: 'generating',
        prompt: params.prompt,
        estimatedTime: result.estimatedTime,
      };

      setGenerations(prev => [newGeneration, ...prev]);
      
      // Start polling for this generation
      startPolling(result.generationId);
      
      return result;
    } catch (error) {
      console.error('Failed to start generation:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const startPolling = useCallback((generationId: string) => {
    const poll = async () => {
      try {
        const response = await fetch(`/api/generate/status/${generationId}`);
        if (!response.ok) return;

        const status = await response.json();

        setGenerations(prev => 
          prev.map(gen => 
            gen.id === generationId 
              ? { ...gen, ...status, id: generationId }
              : gen
          )
        );

        // If completed or failed, stop polling
        if (status.status === 'completed' || status.status === 'failed') {
          const timeout = pollTimeouts.current.get(generationId);
          if (timeout) {
            clearTimeout(timeout);
            pollTimeouts.current.delete(generationId);
          }
          return;
        }

        // Continue polling every 3 seconds
        const timeout = setTimeout(poll, 3000);
        pollTimeouts.current.set(generationId, timeout);
      } catch (error) {
        console.error('Polling error:', error);
        // Retry in 5 seconds on error
        const timeout = setTimeout(poll, 5000);
        pollTimeouts.current.set(generationId, timeout);
      }
    };

    // Start first poll after 2 seconds
    const timeout = setTimeout(poll, 2000);
    pollTimeouts.current.set(generationId, timeout);
  }, []);

  const removeGeneration = useCallback((generationId: string) => {
    const timeout = pollTimeouts.current.get(generationId);
    if (timeout) {
      clearTimeout(timeout);
      pollTimeouts.current.delete(generationId);
    }
    
    setGenerations(prev => prev.filter(gen => gen.id !== generationId));
  }, []);

  return {
    generations,
    isGenerating,
    startGeneration,
    removeGeneration,
  };
}