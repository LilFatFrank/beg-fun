"use client";

const RoadMapInfo = () => (
  <>
    <div className="flex items-center justify-between w-full h-[60px] relative">
      <img
        src="/assets/roadmape-icon.svg"
        alt="roadmape"
        className="absolute left-[-40px] top-[40%] translate-y-[-50%]"
      />
      <img
        src="https://media.tenor.com/0iHLh37L15EAAAAj/lfg-wsb.gif"
        width={105}
        height={89}
        className="absolute right-[0px] top-[-24px]"
      />
    </div>
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">
        500K - Rewards
      </p>
      <p className="text-[16px] text-black">
        Top beggars/donors are dropped $BEGS
      </p>
    </div>
    <hr className="w-full h-0 border-[0.5px] border-[#5D3014] opacity-100" />
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">
        1M- Image/Video
      </p>
      <p className="text-[16px] text-black">Upload content and beg</p>
    </div>
    <hr className="w-full h-0 border-[0.5px] border-[#5D3014] opacity-100" />
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">
        5M- Leaderboard
      </p>
      <p className="text-[16px] text-black">Beggar/donor of the day</p>
    </div>
    <hr className="w-full h-0 border-[0.5px] border-[#5D3014] opacity-100" />
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">10M- BegPad</p>
      <p className="text-[16px] text-black">Official launchpad to beg</p>
    </div>
    <hr className="w-full h-0 border-[0.5px] border-[#5D3014] opacity-100" />
    <div>
      <p className="text-[20px] text-[#5D3014] font-bold mb-2">
        20M- Livestream
      </p>
      <p className="text-[16px] text-black">Beggars can livestream</p>
    </div>
  </>
);

export default RoadMapInfo;
