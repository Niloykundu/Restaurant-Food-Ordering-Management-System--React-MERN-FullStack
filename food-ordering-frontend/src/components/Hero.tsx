const Hero = () => {
  return (
    <div>
      <img
        src="/hero.png"
        alt="BigHungers hero banner"
        className="w-full max-h-[600px] object-cover"
        loading="eager"
        fetchPriority="high"
      />
    </div>
  );
};

export default Hero;
