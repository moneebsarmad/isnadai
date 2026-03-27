'use client'
import { Component, type ReactNode } from 'react'

export class TreeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full text-neutral-500 text-sm">
          Tree rendering failed. Try refreshing.
        </div>
      )
    }
    return this.props.children
  }
}
