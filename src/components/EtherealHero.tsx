import React from 'react';

interface EtherealHeroProps {
  title?: string;
  subtitle?: string;
}

const EtherealHero: React.FC<EtherealHeroProps> = ({ 
  title = "Mountain Resort Check-In", 
  subtitle = "Welcome to your alpine sanctuary" 
}) => {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#A8D0E6] via-[#C8E6F5] via-[#D1C4E9] to-[#E1BEE7] min-h-[400px] flex items-center justify-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0">
        {/* Cloud Patterns */}
        <div className="cloud-drift absolute top-10 left-0 w-96 h-32 opacity-20">
          <svg viewBox="0 0 400 120" className="w-full h-full">
            <path d="M50,80 Q20,40 60,40 Q80,20 120,40 Q160,20 200,40 Q240,20 280,40 Q320,20 360,40 Q380,60 350,80 Z" 
                  fill="rgba(255,255,255,0.3)" />
          </svg>
        </div>
        
        <div className="cloud-drift absolute top-32 right-0 w-80 h-28 opacity-15" style={{animationDelay: '-10s'}}>
          <svg viewBox="0 0 320 112" className="w-full h-full">
            <path d="M40,70 Q15,35 50,35 Q70,15 110,35 Q150,15 190,35 Q230,15 270,35 Q290,55 260,70 Z" 
                  fill="rgba(255,255,255,0.4)" />
          </svg>
        </div>

        <div className="cloud-drift absolute bottom-20 left-1/4 w-72 h-24 opacity-25" style={{animationDelay: '-15s'}}>
          <svg viewBox="0 0 288 96" className="w-full h-full">
            <path d="M36,60 Q12,30 45,30 Q63,12 99,30 Q135,12 171,30 Q207,12 243,30 Q261,48 234,60 Z" 
                  fill="rgba(255,255,255,0.2)" />
          </svg>
        </div>
      </div>

      {/* Floating Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Mountain Peaks */}
        <div className="floating-element absolute top-16 left-16 opacity-30" style={{animationDelay: '0s'}}>
          <svg width="60" height="60" viewBox="0 0 60 60" fill="none">
            <path d="M10 45 L20 25 L30 35 L40 20 L50 45 Z" fill="rgba(255,255,255,0.4)" stroke="rgba(168,208,230,0.6)" strokeWidth="2"/>
          </svg>
        </div>

        <div className="floating-element absolute top-24 right-20 opacity-25" style={{animationDelay: '2s'}}>
          <svg width="50" height="50" viewBox="0 0 50 50" fill="none">
            <path d="M8 38 L16 22 L24 30 L32 18 L42 38 Z" fill="rgba(255,255,255,0.3)" stroke="rgba(200,230,245,0.7)" strokeWidth="2"/>
          </svg>
        </div>

        {/* Snowflakes */}
        <div className="floating-element absolute top-32 left-1/3 opacity-40" style={{animationDelay: '1s'}}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2 L12 22 M2 12 L22 12 M6.34 6.34 L17.66 17.66 M17.66 6.34 L6.34 17.66" 
                  stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>

        <div className="floating-element absolute bottom-32 right-1/3 opacity-35" style={{animationDelay: '3s'}}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M10 1 L10 19 M1 10 L19 10 M4.22 4.22 L15.78 15.78 M15.78 4.22 L4.22 15.78" 
                  stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>

        {/* Pine Trees */}
        <div className="floating-element absolute bottom-16 left-12 opacity-30" style={{animationDelay: '4s'}}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <path d="M20 5 L15 15 L25 15 Z" fill="rgba(168,208,230,0.4)"/>
            <path d="M20 12 L13 22 L27 22 Z" fill="rgba(168,208,230,0.3)"/>
            <path d="M20 19 L11 29 L29 29 Z" fill="rgba(168,208,230,0.2)"/>
            <rect x="18" y="29" width="4" height="8" fill="rgba(139,69,19,0.3)"/>
          </svg>
        </div>

        <div className="floating-element absolute bottom-20 right-16 opacity-25" style={{animationDelay: '5s'}}>
          <svg width="35" height="35" viewBox="0 0 35 35" fill="none">
            <path d="M17.5 4 L13 13 L22 13 Z" fill="rgba(200,230,245,0.4)"/>
            <path d="M17.5 10 L11.5 19 L23.5 19 Z" fill="rgba(200,230,245,0.3)"/>
            <path d="M17.5 16 L9.5 25 L25.5 25 Z" fill="rgba(200,230,245,0.2)"/>
            <rect x="15.5" y="25" width="4" height="7" fill="rgba(139,69,19,0.3)"/>
          </svg>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto">
        <h1 className="dancing-script text-5xl md:text-7xl font-bold text-white mb-4 drop-shadow-lg">
          {title}
        </h1>
        <p className="text-xl md:text-2xl text-white/90 font-light tracking-wide drop-shadow-md">
          {subtitle}
        </p>
        
        {/* Decorative Divider */}
        <div className="mt-8 flex items-center justify-center">
          <div className="h-px bg-white/30 flex-1 max-w-32"></div>
          <div className="mx-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white/60">
              <path d="M12 2 L15.09 8.26 L22 9 L17 14 L18.18 21 L12 17.77 L5.82 21 L7 14 L2 9 L8.91 8.26 L12 2 Z" 
                    fill="currentColor"/>
            </svg>
          </div>
          <div className="h-px bg-white/30 flex-1 max-w-32"></div>
        </div>
      </div>

      {/* Bottom Gradient Fade */}
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-[#F8FBFF] to-transparent"></div>
    </div>
  );
};

export default EtherealHero;