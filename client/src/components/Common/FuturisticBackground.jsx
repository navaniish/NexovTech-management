import React, { useEffect, useRef } from 'react';
import './FuturisticBackground.css';

const FuturisticBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width, height;
    let particles = [];
    let lines = [];
    const particleCount = 60;
    const lineCount = 5;
    const connectionDistance = 150;
    
    const mouse = {
      x: null,
      y: null,
      radius: 150
    };

    const init = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      particles = [];
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          size: Math.random() * 2 + 1,
          color: i % 2 === 0 ? 'rgba(0, 243, 255, 0.6)' : 'rgba(0, 112, 255, 0.4)'
        });
      }

      lines = [];
      for (let i = 0; i < lineCount; i++) {
        lines.push({
          x: Math.random() * width,
          y: Math.random() * height,
          length: Math.random() * 300 + 200,
          angle: -Math.PI / 4, // Diagonal
          speed: Math.random() * 1 + 0.5,
          opacity: Math.random() * 0.5 + 0.1
        });
      }
    };

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(0, 243, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 100;
      
      const offsetX = (mouse.x - width / 2) * 0.02;
      const offsetY = (mouse.y - height / 2) * 0.02;

      ctx.beginPath();
      for (let x = offsetX % gridSize; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = offsetY % gridSize; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Subtle circuit nodes
      ctx.fillStyle = 'rgba(0, 243, 255, 0.05)';
      for (let x = offsetX % gridSize; x < width; x += gridSize) {
        for (let y = offsetY % gridSize; y < height; y += gridSize) {
          if ((x + y) % 300 === 0) {
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
            
            // Circuit lines
            ctx.strokeStyle = 'rgba(0, 243, 255, 0.05)';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 20, y + 20);
            ctx.lineTo(x + 40, y + 20);
            ctx.stroke();
          }
        }
      }
    };

    const drawPanels = () => {
      ctx.fillStyle = 'rgba(0, 243, 255, 0.01)';
      ctx.beginPath();
      ctx.moveTo(width * 0.7, 0);
      ctx.lineTo(width, 0);
      ctx.lineTo(width, height * 0.3);
      ctx.closePath();
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(0, height * 0.7);
      ctx.lineTo(0, height);
      ctx.lineTo(width * 0.3, height);
      ctx.closePath();
      ctx.fill();
    };

    const drawParticles = () => {
      particles.forEach((p, i) => {
        const px = p.x + (mouse.x - width / 2) * 0.01;
        const py = p.y + (mouse.y - height / 2) * 0.01;

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(px, py, p.size, 0, Math.PI * 2);
        ctx.fill();

        if (Math.random() > 0.98) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = p.color;
          ctx.fill();
          ctx.shadowBlur = 0;
        }

        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < connectionDistance) {
            ctx.strokeStyle = `rgba(0, 243, 255, ${0.15 * (1 - dist / connectionDistance)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(px, py);
            ctx.lineTo(p2.x + (mouse.x - width / 2) * 0.01, p2.y + (mouse.y - height / 2) * 0.01);
            ctx.stroke();
          }
        }
      });
    };

    const drawLightStreaks = () => {
      lines.forEach(l => {
        const x2 = l.x + Math.cos(l.angle) * l.length;
        const y2 = l.y + Math.sin(l.angle) * l.length;

        const gradient = ctx.createLinearGradient(l.x, l.y, x2, y2);
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.5, `rgba(0, 243, 255, ${l.opacity})`);
        gradient.addColorStop(1, 'transparent');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(l.x, l.y);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        l.x += Math.cos(l.angle) * l.speed;
        l.y += Math.sin(l.angle) * l.speed;

        if (l.x < -300 || l.y > height + 300) {
          l.x = Math.random() * width + 300;
          l.y = -300;
          l.opacity = Math.random() * 0.4 + 0.1;
        }
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      const bgGradient = ctx.createRadialGradient(
        width / 2 + (mouse.x - width / 2) * 0.05, 
        height / 2 + (mouse.y - height / 2) * 0.05, 
        0, 
        width / 2, 
        height / 2, 
        width
      );
      bgGradient.addColorStop(0, '#0f172a');
      bgGradient.addColorStop(1, '#020617');
      
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      drawGrid();
      drawPanels();
      drawLightStreaks();
      drawParticles();

      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      init();
    };

    const handleMouseMove = (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);
    
    init();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="futuristic-bg-container">
      <canvas ref={canvasRef} className="futuristic-bg-canvas" />
      <div className="futuristic-bg-overlay"></div>
    </div>
  );
};

export default FuturisticBackground;
