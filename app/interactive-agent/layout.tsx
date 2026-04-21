import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'zju_math_helper',
  description: 'zju_math_helper interactive animation generator',
};

export default function InteractiveAgentLayout({ children }: { children: ReactNode }) {
  return children;
}
