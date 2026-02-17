"use client";

import { useEffect, useRef } from 'react';

interface Particle3D {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    size: number;
    color: string;
    shape: 'circle' | 'triangle' | 'hexagon';
    rotation: number;
    rotationSpeed: number;
}

export default function ParticleBackground() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let particles: Particle3D[] = [];
        let width = window.innerWidth;
        let height = window.innerHeight;

        // 3D Configuration
        const particleCount = window.innerWidth < 768 ? 60 : 150;
        const focalLength = 400; // Distance from viewer to screen
        const depth = 2000; // Total depth of the particle field

        const colors = ['#3A86FF', '#8338EC', '#FF006E', '#00F5D4'];
        const shapes: ('circle' | 'triangle' | 'hexagon')[] = ['circle', 'triangle', 'hexagon'];

        const init = () => {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;

            particles = [];
            for (let i = 0; i < particleCount; i++) {
                particles.push(createParticle(true));
            }
        };

        const createParticle = (randomZ: boolean = false): Particle3D => {
            return {
                x: (Math.random() - 0.5) * width * 2, // Spread wider for panning
                y: (Math.random() - 0.5) * height * 2,
                z: randomZ ? (Math.random() - 0.5) * depth : depth / 2, // Start far back if new
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                vz: (Math.random() - 0.5) * 2, // Move in/out
                size: Math.random() * 6 + 2,
                color: colors[Math.floor(Math.random() * colors.length)],
                shape: shapes[Math.floor(Math.random() * shapes.length)],
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.02,
            };
        };

        const drawPolygon = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, sides: number, rotation: number, color: string, alpha: number) => {
            ctx.beginPath();
            ctx.fillStyle = color;
            ctx.moveTo(x + radius * Math.cos(rotation), y + radius * Math.sin(rotation));
            for (let i = 1; i <= sides; i++) {
                ctx.lineTo(x + radius * Math.cos(rotation + i * 2 * Math.PI / sides), y + radius * Math.sin(rotation + i * 2 * Math.PI / sides));
            }
            ctx.globalAlpha = alpha * 0.6;
            ctx.fill();
            ctx.globalAlpha = 1.0;
        };

        const render = () => {
            ctx.clearRect(0, 0, width, height);

            // Center of screen
            const cx = width / 2;
            const cy = height / 2;

            // Mouse interaction: Rotate/Tilt the world based on mouse position
            // Normalize mouse pos (-1 to 1)
            const mx = (mouseRef.current.x - cx) / cx;
            const my = (mouseRef.current.y - cy) / cy;

            particles.forEach((p) => {
                // Update Physics
                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz - 2; // Constant movement towards screen (warp speed effect)
                p.rotation += p.rotationSpeed;

                // Reset particles that pass the screen
                if (p.z < -focalLength + 50) {
                    p.z = depth / 2; // Send to back
                    p.x = (Math.random() - 0.5) * width * 2;
                    p.y = (Math.random() - 0.5) * height * 2;
                }
                if (p.x > width * 1.5 || p.x < -width * 1.5) p.vx *= -1;
                if (p.y > height * 1.5 || p.y < -height * 1.5) p.vy *= -1;


                // 3D Projection
                // Apply subtle rotation based on mouse
                const relativeZ = p.z;
                const scale = focalLength / (focalLength + relativeZ);

                const projectedX = cx + (p.x - (mx * 200)) * scale;
                const projectedY = cy + (p.y - (my * 200)) * scale;

                const projectedSize = p.size * scale;

                // Opacity fade based on depth (fades in from back, fades out near camera)
                const opacity = Math.max(0, Math.min(1, (depth / 2 - Math.abs(p.z)) / (depth / 2)));


                if (scale > 0 && opacity > 0.01) {
                    if (p.shape === 'circle') {
                        ctx.beginPath();
                        ctx.arc(projectedX, projectedY, projectedSize, 0, Math.PI * 2);
                        ctx.fillStyle = p.color;
                        ctx.globalAlpha = opacity * 0.5;
                        ctx.fill();
                        ctx.globalAlpha = 1.0;
                    } else if (p.shape === 'triangle') {
                        drawPolygon(ctx, projectedX, projectedY, projectedSize * 1.5, 3, p.rotation, p.color, opacity);
                    } else if (p.shape === 'hexagon') {
                        drawPolygon(ctx, projectedX, projectedY, projectedSize * 1.5, 6, p.rotation, p.color, opacity);
                    }
                }
            });

            animationFrameId = requestAnimationFrame(render);
        };

        const handleMouseMove = (e: MouseEvent) => {
            mouseRef.current = { x: e.clientX, y: e.clientY };
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (e.touches.length > 0) {
                mouseRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            }
        }

        init();
        render();

        const handleResize = () => {
            init();
        };

        window.addEventListener('resize', handleResize);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('touchmove', handleTouchMove);

        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('touchmove', handleTouchMove);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 -z-50 pointer-events-none bg-transparent"
        />
    );
}
