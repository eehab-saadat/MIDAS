import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Vitals } from "@/lib/patients";
import {
  Activity,
  Heart,
  Droplet,
  Thermometer,
  TrendingUp,
  Wind,
} from "lucide-react";

interface VitalsDisplayProps {
  vitals: Vitals;
}

export function VitalsDisplay({ vitals }: VitalsDisplayProps) {
  return (
    <Card className="h-full">
      <CardContent className="space-y-3 text-xs h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full p-3">
        <div className="grid grid-cols-3 gap-3">
          {/* Weight */}
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Weight</span>
            </div>
            <div className="ml-6 font-medium">{vitals.weight_kg} kg</div>
          </div>

          {/* BMI */}
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">BMI</span>
            </div>
            <div className="ml-6 font-medium">{vitals.bmi_estimate}</div>
          </div>

          {/* Blood Pressure */}
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Heart className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">BP</span>
            </div>
            <div className="ml-6 font-medium">{vitals.blood_pressure_mmHg}</div>
          </div>

          {/* Heart Rate */}
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Droplet className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">HR</span>
            </div>
            <div className="ml-6 font-medium">{vitals.heart_rate_bpm} bpm</div>
          </div>

          {/* SpO2 */}
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Wind className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">SpO₂</span>
            </div>
            <div className="ml-6 font-medium">{vitals.spo2_percent}%</div>
          </div>

          {/* Temperature */}
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Thermometer className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">Temp</span>
            </div>
            <div className="ml-6 font-medium">{vitals.temperature}°F</div>
          </div>

          {/* Blood Glucose */}
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Droplet className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                Blood Glucose
              </span>
            </div>
            <div className="ml-6 font-medium">{vitals.blood_glucose}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
