import type {Metadata} from "next";
import {settings} from "@/lib/db";
import {publicAccess} from "@/lib/auth";
import AboutContent from "@/components/about-content";
export const metadata:Metadata={title:"About",description:"The person behind the independent lab.",alternates:{canonical:"/about"}};
export default async function About(){if(!(await publicAccess()))return null;return <AboutContent settings={await settings()}/>;}
