"use client";

import React, { useState } from 'react';
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Loader from "@/components/ui/Loader";
import { motion, AnimatePresence } from "framer-motion";

export const dynamic = 'force-dynamic';

interface Module {
  id: string;
  label: string;
  icon: string;
  route: string;
  gradient: string;
}

const modules: Module[] = [
  { id: 'announcements', label: 'Announcements', icon: '📢', route: '/announcements', gradient: 'from-orange-500 to-red-600' },
  { id: 'employees', label: 'Employees', icon: '👥', route: '/employees', gradient: 'from-blue-500 to-indigo-600' },
  { id: 'attendance', label: 'Attendance', icon: '⏰', route: '/attendance', gradient: 'from-green-500 to-emerald-600' },
  { id: 'documents', label: 'Documents', icon: '📁', route: '/documents', gradient: 'from-purple-500 to-pink-600' },
];

export default function HRDashboard() {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(1); // Start with Employees centered

  React.useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else if (user.role !== "human_resources" && user.role !== "super_admin") {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <Loader />
      </div>
    );
  }

  const handleNext = () => {
    setActiveIndex((prev) => (prev + 1) % modules.length);
  };

  const handlePrev = () => {
    setActiveIndex((prev) => (prev - 1 + modules.length) % modules.length);
  };

  const handleModuleClick = () => {
    router.push(modules[activeIndex].route);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-8 flex flex-col">
      {/* Header */}
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-white mb-3">
          HR Dashboard
        </h1>
        <p className="text-slate-300 text-lg">
          Welcome back, {user.email}
        </p>
      </div>

      {/* Module Carousel */}
      <div className="flex-1 flex items-center justify-center relative">
        <div className="relative w-full max-w-6xl h-96 flex items-center justify-center">
          {/* Left Arrow */}
          <button
            onClick={handlePrev}
            className="absolute left-0 z-20 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-2xl transition-all duration-300 hover:scale-110"
          >
            ←
          </button>

          {/* Module Cards */}
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="popLayout">
              {modules.map((module, index) => {
                const offset = index - activeIndex;
                const isActive = offset === 0;
                const isVisible = Math.abs(offset) <= 2;

                if (!isVisible) return null;

                return (
                  <motion.div
                    key={module.id}
                    initial={{ x: offset * 400, scale: 0.7, opacity: 0.3 }}
                    animate={{
                      x: offset * 400,
                      scale: isActive ? 1.1 : 0.7,
                      opacity: isActive ? 1 : 0.3,
                      zIndex: isActive ? 10 : 1,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 30,
                    }}
                    onClick={isActive ? handleModuleClick : undefined}
                    className={`absolute ${isActive ? 'cursor-pointer' : 'pointer-events-none'}`}
                  >
                    <motion.div
                      whileHover={isActive ? { scale: 1.05 } : {}}
                      className={`w-80 h-80 rounded-3xl shadow-2xl bg-gradient-to-br ${module.gradient} p-8 flex flex-col items-center justify-center backdrop-blur-lg border border-white/20`}
                    >
                      <motion.div
                        animate={isActive ? { rotate: [0, -10, 10, 0] } : {}}
                        transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                        className="text-9xl mb-6"
                      >
                        {module.icon}
                      </motion.div>
                      <h3 className="text-3xl font-bold text-white text-center mb-3">
                        {module.label}
                      </h3>
                      {isActive && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                        >
                          <div className="text-white/80 text-center text-sm mb-4">
                            Click to open
                          </div>
                          <div className="flex items-center justify-center space-x-2 text-white/60">
                            <span className="text-xs">Press Enter</span>
                            <span className="text-2xl">→</span>
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Right Arrow */}
          <button
            onClick={handleNext}
            className="absolute right-0 z-20 w-14 h-14 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white text-2xl transition-all duration-300 hover:scale-110"
          >
            →
          </button>
        </div>
      </div>

      {/* Keyboard Hint */}
      <div className="text-center mt-8">
        <p className="text-white/60 text-sm">
          Use ← → arrows to navigate • Click the active module to open
        </p>
      </div>
    </div>
  );
}
