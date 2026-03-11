"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";

const FullLogo = () => {
  return (
    <Link href={"/"} className="flex items-center gap-2 no-underline">
      <Image
        src="/images/logo.png"
        alt="JR Snooker Lounge"
        width={40}
        height={40}
        className="rounded-lg"
        priority
      />
      <div className="flex flex-col leading-tight">
        <span className="font-bold text-sm text-dark dark:text-white leading-none">JR Snooker</span>
        <span className="text-xs text-bodytext leading-none">Lounge</span>
      </div>
    </Link>
  );
};

export default FullLogo;
