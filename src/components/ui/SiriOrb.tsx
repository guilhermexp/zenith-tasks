"use client"

import { motion } from "motion/react"
import React from "react"

interface SiriOrbProps {
  size?: string
  colors?: {
    bg?: string
  }
}

const SiriOrb: React.FC<SiriOrbProps> = ({ size = "24px", colors = {} }) => {
  return (
    <div
      className="relative flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500 blur-md opacity-60 animate-pulse" />
      <motion.div
        className="relative rounded-full bg-gradient-to-r from-purple-500 via-blue-500 to-pink-500"
        style={{ width: size, height: size }}
        animate={{
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  )
}

export default SiriOrb
