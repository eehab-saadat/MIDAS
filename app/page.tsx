// app/page.tsx
import { ThemeToggle } from "@/components/theme-toggle";
import { PatientInfo } from "@/components/patient-info";
import { ArrowLeft } from "lucide-react";

export default function Home() {
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
            <div className="flex-1 bg-card rounded-tl-lg rounded-tr-lg flex items-center justify-center p-[0.5vh] text-foreground text-sm">
              Bottom Half
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
          <div
            className={`${greyBoxClasses} rounded-tl-none col-span-full md:col-span-1 lg:col-span-2 mr-1`}
          >
            Bottom Left Content
          </div>

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
