// app/patients/page.tsx
"use client";

import { useState } from "react";
import { Search, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";

interface Patient {
  id: string;
  name: string;
  age: number;
  gender: string;
  dob: string;
  phone: string;
  address: string;
  email: string;
  lastVisit: string;
  status: "active" | "inactive";
  image?: string;
}

const mockPatients: Patient[] = [
  {
    id: "PAT-001234",
    name: "John Doe",
    age: 35,
    gender: "Male",
    dob: "January 15, 1990",
    phone: "(555) 123-4567",
    address: "123 Main Street, Anytown, USA 12345",
    email: "john.doe@email.com",
    lastVisit: "2025-10-25",
    status: "active",
  },
  {
    id: "PAT-001235",
    name: "Jane Smith",
    age: 28,
    gender: "Female",
    dob: "March 22, 1997",
    phone: "(555) 234-5678",
    address: "456 Oak Avenue, Somewhere, USA 12346",
    email: "jane.smith@email.com",
    lastVisit: "2025-10-20",
    status: "active",
  },
  {
    id: "PAT-001236",
    name: "Robert Johnson",
    age: 52,
    gender: "Male",
    dob: "July 8, 1973",
    phone: "(555) 345-6789",
    address: "789 Pine Road, Elsewhere, USA 12347",
    email: "robert.johnson@email.com",
    lastVisit: "2025-10-15",
    status: "active",
  },
  {
    id: "PAT-001237",
    name: "Maria Garcia",
    age: 41,
    gender: "Female",
    dob: "November 30, 1984",
    phone: "(555) 456-7890",
    address: "321 Elm Street, Nowhere, USA 12348",
    email: "maria.garcia@email.com",
    lastVisit: "2025-09-28",
    status: "inactive",
  },
  {
    id: "PAT-001238",
    name: "David Wilson",
    age: 63,
    gender: "Male",
    dob: "February 14, 1962",
    phone: "(555) 567-8901",
    address: "654 Maple Drive, Anywhere, USA 12349",
    email: "david.wilson@email.com",
    lastVisit: "2025-10-10",
    status: "active",
  },
];

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
          <Image
            src="/midas-logo.png"
            alt="MIDAS Logo"
            className="h-8 w-auto"
            width={32}
            height={32}
          />
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
                    <Link href={`/?patient=${patient.id}`}>View Details</Link>
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
