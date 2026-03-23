import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  MapPin,
  Calendar,
  User,
  Hash,
  Mail,
  Briefcase,
  Globe,
} from "lucide-react";
import { PersonalInformationDetail } from "@/lib/patients";

interface PatientInfoProps {
  personalInfo: PersonalInformationDetail;
}

export function PatientInfo({ personalInfo }: PatientInfoProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const fullName = `${personalInfo.salutation} ${personalInfo.name}`;

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>{getInitials(personalInfo.name)}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <CardTitle className="text-lg">{fullName}</CardTitle>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{personalInfo.age} years old</span>
              <Badge variant="secondary" className="text-xs">
                {personalInfo.sex}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs max-h-[calc(100%-80px)] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                Ethnicity
              </span>
            </div>
            <div className="ml-6 font-medium text-xs">
              {personalInfo.ethnicity}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                Occupation
              </span>
            </div>
            <div className="ml-6 font-medium text-xs">
              {personalInfo.occupation}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                Smoking Status
              </span>
            </div>
            <div className="ml-6 font-medium text-xs">
              {personalInfo.social_determinants.smoking_status}
            </div>
          </div>

          <div className="space-y-0.5">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                Physical Activity
              </span>
            </div>
            <div className="ml-6 font-medium text-xs text-wrap">
              {personalInfo.social_determinants.physical_activity}
            </div>
          </div>

          <div className="col-span-2 space-y-0.5">
            <div className="flex items-center space-x-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground font-medium">
                Hearing Status
              </span>
            </div>
            <div className="ml-6 font-medium text-xs text-wrap">
              {personalInfo.social_determinants.hearing_impairment}
            </div>
          </div>

          {Object.keys(personalInfo.family_history).length > 0 && (
            <div className="col-span-2 space-y-0.5 pt-2 border-t">
              <span className="text-muted-foreground font-medium">
                Family History
              </span>
              <div className="ml-2 space-y-1 flex flex-wrap gap-1">
                {Object.entries(personalInfo.family_history).map(
                  ([condition, present]) => (
                    <Badge
                      key={condition}
                      variant={present ? "default" : "secondary"}
                      className="text-xs capitalize"
                    >
                      {condition.replace(/_/g, " ")}: {present ? "Yes" : "No"}
                    </Badge>
                  )
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
