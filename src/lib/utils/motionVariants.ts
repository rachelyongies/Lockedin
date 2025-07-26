import { Variants } from 'framer-motion';

export const containerVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5,
      staggerChildren: 0.1
    }
  },
};

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      type: 'spring',
      damping: 25,
      stiffness: 300
    }
  },
};

export const swapButtonVariants: Variants = {
  idle: { 
    rotate: 0,
    scale: 1,
    backgroundColor: 'rgba(16, 18, 22, 0.8)'
  },
  hover: { 
    rotate: 180,
    scale: 1.1,
    backgroundColor: 'rgba(103, 126, 234, 0.2)',
    transition: { duration: 0.3 }
  },
  tap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  },
  swapping: {
    rotate: 360,
    scale: 1.1,
    backgroundColor: 'rgba(103, 126, 234, 0.3)',
    transition: { 
      rotate: { duration: 0.3, ease: 'easeInOut' },
      scale: { duration: 0.3 }
    }
  }
};

export const fadeInVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.3 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};