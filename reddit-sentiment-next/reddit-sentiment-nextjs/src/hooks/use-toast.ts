'use client';

import { useState, useCallback, useEffect } from 'react';

interface Toast {
  id: string;
  title: string;
  description?: string;
  variant?: 'default' | 'destructive';
}

interface ToastState {
  toasts: Toast[];
}

const initialState: ToastState = {
  toasts: [],
};

let state = initialState;
let listeners: Array<(state: ToastState) => void> = [];

function dispatch(action: { type: string; payload?: string | Toast }) {
  switch (action.type) {
    case 'ADD_TOAST':
      if (action.payload && typeof action.payload === 'object' && 'id' in action.payload) {
        state = {
          ...state,
          toasts: [...state.toasts, action.payload as Toast],
        };
      }
      break;
    case 'REMOVE_TOAST':
      if (typeof action.payload === 'string') {
        state = {
          ...state,
          toasts: state.toasts.filter((toast) => toast.id !== action.payload),
        };
      }
      break;
    case 'DISMISS_TOAST':
      if (typeof action.payload === 'string') {
        state = {
          ...state,
          toasts: state.toasts.map((toast) =>
            toast.id === action.payload ? { ...toast, open: false } : toast
          ),
        };
      }
      break;
  }
  
  listeners.forEach((listener) => listener(state));
}

function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

export function useToast() {
  const [toastState, setToastState] = useState(state);

  const subscribe = useCallback((listener: (state: ToastState) => void) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const toast = useCallback(
    ({ title, description, variant = 'default' }: Omit<Toast, 'id'>) => {
      const id = generateId();
      
      dispatch({
        type: 'ADD_TOAST',
        payload: {
          id,
          title,
          description,
          variant,
        },
      });

      // Auto-dismiss after 5 seconds
      setTimeout(() => {
        dispatch({
          type: 'REMOVE_TOAST',
          payload: id,
        });
      }, 5000);

      return id;
    },
    []
  );

  const dismiss = useCallback((toastId?: string) => {
    if (toastId) {
      dispatch({
        type: 'REMOVE_TOAST',
        payload: toastId,
      });
    } else {
      // Dismiss all toasts
      state.toasts.forEach((toast) => {
        dispatch({
          type: 'REMOVE_TOAST',
          payload: toast.id,
        });
      });
    }
  }, []);

  // Subscribe to state changes
  useEffect(() => {
    const unsubscribe = subscribe(setToastState);
    return unsubscribe;
  }, [subscribe]);

  return {
    toast,
    dismiss,
    toasts: toastState.toasts,
  };
}