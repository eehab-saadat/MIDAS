import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Phone, MapPin, Calendar, User, Hash, Mail } from "lucide-react";

interface PatientInfoProps {
  name: string;
  image?: string;
  age: number;
  gender: string;
  id: string;
  dob: string;
  phone: string;
  address: string;
  email?: string;
}

export function PatientInfo({
  name,
  image,
  age,
  gender,
  id,
  dob,
  phone,
  address,
  email,
}: PatientInfoProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center space-x-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={image} alt={name} />
            <AvatarFallback>
              {name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <CardTitle className="text-lg">{name}</CardTitle>

            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <User className="h-3 w-3" />
              <span>{age} years old</span>
              <Badge variant="secondary" className="text-xs">
                {gender}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4 text-xs">
          {/* Left Column - ID and DOB */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">ID</span>
              </div>
              <div className="ml-6 font-medium">{id}</div>
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">DOB</span>
              </div>
              <div className="ml-6 font-medium">{dob}</div>
            </div>
          </div>

          {/* Right Column - Phone and Email */}
          <div className="space-y-3">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground font-medium">Phone</span>
              </div>
              <div className="ml-6 font-medium">{phone}</div>
            </div>
            {email && (
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground font-medium">
                    Email
                  </span>
                </div>
                <div className="ml-6 font-medium">{email}</div>
              </div>
            )}
          </div>
        </div>

        {/* Address - spans both columns */}
        <div className="space-y-0.5 text-xs">
          <div className="flex items-center space-x-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground font-medium">Address</span>
          </div>
          <div className="ml-6 font-medium">{address}</div>
        </div>
      </CardContent>
    </Card>
  );
}
