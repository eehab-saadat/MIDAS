"use client";

import { useState } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Patient, mockPatients } from "@/lib/patients";

export default function PatientsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState(mockPatients);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = mockPatients.filter(
      (patient) =>
        patient.name.toLowerCase().includes(term.toLowerCase()) ||
        patient.id.toLowerCase().includes(term.toLowerCase()) ||
        patient.email.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredPatients(filtered);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="h-screen w-screen px-[1vw] py-[1vh] text-foreground relative overflow-hidden">
      <div className="col-span-full rounded-lg h-[5vh] flex items-center justify-between text-foreground text-lg mb-1">
        <div className="flex items-center">
          {/* <Link
            href="/patients"
            className="bg-card rounded-full p-1 mr-4 border hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="text-sm">Patient List</div>
            <div className="text-sm">NRN: 123456789</div>
          </div> */}
        </div>
        {/* MIDAS Logo */}
        <div className="flex items-center">
          <span className="absolute left-1/2 transform -translate-x-1/2 text-lg font-bold">
            MIDAS
          </span>
        </div>
        <ThemeToggle />
      </div>

      {/* Search Bar */}
      <div className="mb-4 mt-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients by name, ID, or email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
        {filteredPatients.map((patient) => (
          <Card
            key={patient.id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={patient.image} alt={patient.name} />
                  <AvatarFallback>{getInitials(patient.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">
                    {patient.name}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {patient.id}
                  </div>
                </div>
                <Badge
                  variant={
                    patient.status === "active" ? "default" : "secondary"
                  }
                >
                  {patient.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span>{patient.age} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span>{patient.gender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Visit:</span>
                  <span>
                    {new Date(patient.lastVisit).toLocaleDateString()}
                  </span>
                </div>
                <div className="pt-2">
                  <Button size="sm" className="w-full text-xs" asChild>
                    <Link href={`/patient?patient=${patient.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
