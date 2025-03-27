"use client";
import BackToBegs from "@/components/BackToBegs";
import RoadMapInfo from "@/components/RoadmapInfo";

const Roadmap = () => {
  return (
    <div className="lg:hidden block py-8">
      <BackToBegs />
      <div className="border border-[#FF9933] bg-[#FFD44F] p-5 rounded-[8px] mt-12"><RoadMapInfo /></div>
    </div>
  );
};

export default Roadmap;
