// app/page.tsx
"use client";

import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { PatientInfo } from "@/components/patient-info";
import { ArrowLeft } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { AssetsTable } from "@/components/assets-table";
import { AiSummary } from "@/components/ai-summary";
import { PreviousSessionsTable } from "@/components/previous-sessions-table";
import { SDOHForm } from "@/components/sdoh-form";

export default function Home() {
  const [selectedTab, setSelectedTab] = useState("assets");

  const greyBoxClasses =
    "bg-muted rounded-lg flex items-center justify-center p-[0.5vh] text-foreground text-sm";
  const blackBackgroundClasses =
    "bg-transparent rounded-lg flex items-center justify-center p-[0.5vh] text-white text-sm";

  return (
    <div
      className="h-screen w-screen px-[1vw] py-[1vh] text-foreground relative overflow-hidden"
      style={{
        backgroundImage: "url('/anatomy-bg.png')",
        backgroundSize: "auto 150vh",
        backgroundPosition: "center 1vh",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Main Grid Container */}
      <div className="grid gap-0 grid-template-rows-[5vh_60vh_35vh] h-full">
        {/* Top Header Section */}
        <div className="col-span-full rounded-lg h-[5vh] flex items-center justify-between text-foreground text-lg mb-1">
          <div className="flex items-center">
            <div className="bg-background rounded-full p-1 mr-4 border">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm">Patient List</div>
              {/* <div className="text-sm">NRN: 123456789</div> */}
            </div>
          </div>
          <ThemeToggle />
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-0 auto-rows-fr h-[59vh]">
          {/* Left Box (span 1 col on small, span 1 md, span 1 lg) */}
          <div className="col-span-full md:col-span-1 flex flex-col mr-1">
            <div className="flex-12 mb-1">
              <PatientInfo
                name="John Doe"
                age={35}
                gender="Male"
                id="PAT-001234"
                dob="January 15, 1990"
                phone="(555) 123-4567"
                address="123 Main Street, Anytown, USA 12345"
                email="john.doe@email.com"
              />
            </div>
            <div className="flex-1 bg-card rounded-tl-lg rounded-tr-lg p-[0.5vh]">
              <Tabs
                value={selectedTab}
                onValueChange={setSelectedTab}
                className="w-full h-full"
              >
                <TabsList className="grid w-full grid-cols-4 text-xs">
                  <TabsTrigger className=" text-xs" value="ai-summary">
                    Summary
                  </TabsTrigger>
                  <TabsTrigger className=" text-xs" value="previous-sessions">
                    History
                  </TabsTrigger>
                  <TabsTrigger className=" text-xs" value="assets">
                    Assets
                  </TabsTrigger>
                  <TabsTrigger className=" text-xs" value="sdoh">
                    SDOH
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Center Black Area (span 1 col on small, span 1 md, span 1 lg) */}
          <div
            className={`${blackBackgroundClasses} col-span-full md:col-span-1 lg:col-span-1 mr-1 mb-1`}
          ></div>

          {/* Right Box (span 1 col on small, span 1 md, span 1 lg) */}
          <div className="col-span-full md:col-span-1 gap-0">
            <div className={`${greyBoxClasses} h-[6vh] mb-1`}>Top Right</div>
            <div className={`${greyBoxClasses} h-[86vh]`}>Bottom Right</div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-0 auto-rows-fr mt-0 h-[33.5vh]">
          {/* Bottom Left Large Box (span 1 col on small, span 1 md, span 2 lg) */}
          <Card className="rounded-tl-none col-span-full md:col-span-1 lg:col-span-2 mr-1 h-full p-0">
            <CardContent className="h-full p-0">
              {selectedTab === "assets" && <AssetsTable />}
              {selectedTab === "ai-summary" && <AiSummary />}
              {selectedTab === "previous-sessions" && <PreviousSessionsTable />}
              {selectedTab === "sdoh" && <SDOHForm />}
            </CardContent>
          </Card>

          {/* Bottom Right Stacked Boxes (span 1 col on small, span 1 md, span 1 lg) */}
          {/* <div className="col-span-full md:col-span-1 flex flex-col gap-0 h-full self-end">
            <div className={`${greyBoxClasses} flex-1 mb-1`}>
              Bottom Right Top
            </div>
            <div className={`${greyBoxClasses} flex-1`}>
              Bottom Right Bottom
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
