'use client'
import React from 'react';
import Image from "next/image";
import LogoIcon from '/public/images/logos/logo-icon.svg'
import Link from 'next/link';
const Logo = () => {
  return (
    <Link href={'/'}>
      <Image src="/images/logo.png" alt="logo" width={40} height={40} className="rounded-lg" />
    </Link>
  )
}

export default Logo
