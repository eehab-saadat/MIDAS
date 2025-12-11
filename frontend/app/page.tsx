"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowLeft, Plus, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { getCurrentUser, type User } from "@/lib/auth";
import { PatientData } from "@/lib/patients";

interface PatientDisplay extends PatientData {
  status: "active" | "inactive";
}

export default function PatientsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredPatients, setFilteredPatients] = useState<PatientDisplay[]>(
    []
  );
  const [patients, setPatients] = useState<PatientDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPatientModal, setShowAddPatientModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    salutation: "",
    age: "",
    sex: "",
    email: "",
    phone: "",
    ethnicity: "",
    occupation: "",
    // SDOH (optional)
    smoking_status: "",
    physical_activity: "",
    diet: "",
    hearing_impairment: "",
    access_to_healthcare: "",
    // Vitals (optional)
    weight_kg: "",
    blood_pressure_mmHg: "",
    heart_rate_bpm: "",
    spo2_percent: "",
    temperature: "",
  });

  // Check authentication on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      router.push("/login");
      return;
    }
    setUser(currentUser);
    setIsCheckingAuth(false);
  }, [router]);

  // Fetch patients from API on component mount
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/patients");
        if (!response.ok) {
          throw new Error("Failed to fetch patients");
        }
        const data: PatientData[] = await response.json();

        // Transform API data to display format with status
        const transformedData: PatientDisplay[] = data.map((patient) => ({
          ...patient,
          status: "active" as const,
        }));

        setPatients(transformedData);
        setFilteredPatients(transformedData);
        setError(null);
      } catch (err) {
        console.error("Error fetching patients:", err);
        setError(
          err instanceof Error ? err.message : "Failed to fetch patients"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    const filtered = patients.filter(
      (patient) =>
        patient.personal_information.name
          .toLowerCase()
          .includes(term.toLowerCase()) ||
        patient.patient_id.toLowerCase().includes(term.toLowerCase())
    );
    setFilteredPatients(filtered);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name,
          salutation: formData.salutation,
          age: parseInt(formData.age),
          sex: formData.sex,
          email: formData.email || undefined,
          phone: formData.phone || undefined,
          ethnicity: formData.ethnicity || undefined,
          occupation: formData.occupation || undefined,
          // SDOH fields
          smoking_status: formData.smoking_status || undefined,
          physical_activity: formData.physical_activity || undefined,
          diet: formData.diet || undefined,
          hearing_impairment: formData.hearing_impairment || undefined,
          access_to_healthcare: formData.access_to_healthcare || undefined,
          // Vitals fields
          weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : undefined,
          blood_pressure_mmHg: formData.blood_pressure_mmHg || undefined,
          heart_rate_bpm: formData.heart_rate_bpm ? parseInt(formData.heart_rate_bpm) : undefined,
          spo2_percent: formData.spo2_percent ? parseFloat(formData.spo2_percent) : undefined,
          temperature: formData.temperature || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add patient");
      }

      // Refresh patients list
      const patientsResponse = await fetch("/api/patients");
      if (patientsResponse.ok) {
        const data: PatientData[] = await patientsResponse.json();
        const transformedData: PatientDisplay[] = data.map((patient) => ({
          ...patient,
          status: "active" as const,
        }));
        setPatients(transformedData);
        setFilteredPatients(transformedData);
      }

      // Reset form and close modal
      setFormData({
        name: "",
        salutation: "",
        age: "",
        sex: "",
        email: "",
        phone: "",
        ethnicity: "",
        occupation: "",
        smoking_status: "",
        physical_activity: "",
        diet: "",
        hearing_impairment: "",
        access_to_healthcare: "",
        weight_kg: "",
        blood_pressure_mmHg: "",
        heart_rate_bpm: "",
        spo2_percent: "",
        temperature: "",
      });
      setShowAddPatientModal(false);
    } catch (err) {
      console.error("Error adding patient:", err);
      alert(
        "Failed to add patient: " +
          (err instanceof Error ? err.message : "Unknown error")
      );
    } finally {
      setIsSubmitting(false);
    }
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
      {/* Loading Auth Check */}
      {isCheckingAuth && (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </div>
      )}

      {!isCheckingAuth && (
        <>
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
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {user && <UserMenu />}
        </div>
            </div>

      {/* Role Info Banner */}
      {user && (
        <div className={`mb-4 p-3 rounded-lg border flex items-center gap-3 ${
          user.role === "doctor"
            ? "bg-primary/5 border-primary/20"
            : "bg-secondary/50 border-secondary/20"
        }`}>
          <div className={`size-2 rounded-full ${
            user.role === "doctor" ? "bg-primary" : "bg-secondary-foreground"
          }`} />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">
              Logged in as: <span className="capitalize font-semibold">{user.role}</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {user.role === "doctor"
                ? "You have full access to all features including diagnosis tools and patient management"
                : "You can manage and view patient list"}
            </p>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-4 mt-4 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search patients by name, ID, or email..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={() => setShowAddPatientModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Patient
        </Button>
      </div>

      {/* Patients Grid */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
        {loading && (
          <div className="col-span-full text-center py-8">
            Loading patients...
          </div>
        )}
        {error && (
          <div className="col-span-full text-center py-8 text-red-500">
            Error: {error}
          </div>
        )}
        {!loading && filteredPatients.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No patients found
          </div>
        )}
        {filteredPatients.map((patient) => (
          <Card
            key={patient.patient_id}
            className="hover:shadow-lg transition-shadow cursor-pointer"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage
                    src={undefined}
                    alt={patient.personal_information.name}
                  />
                  <AvatarFallback>
                    {getInitials(patient.personal_information.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-base truncate">
                    {patient.personal_information.salutation}{" "}
                    {patient.personal_information.name}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground">
                    {patient.patient_id}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Age:</span>
                  <span>{patient.personal_information.age} years</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gender:</span>
                  <span>{patient.personal_information.sex}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Last Visit:</span>
                  <span>
                    {new Date(patient.last_visit).toLocaleDateString()}
                  </span>
                </div>
                {user?.role === "doctor" && (
                  <div className="pt-2">
                    <Button size="sm" className="w-full text-xs" asChild>
                      <Link href={`/patient?patient=${patient.patient_id}`}>
                        View Details
                      </Link>
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-foreground [&::-webkit-scrollbar-thumb]:rounded-r-full">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle>Add New Patient</CardTitle>
              <button
                onClick={() => setShowAddPatientModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddPatient} className="space-y-4">
                <div>
                  <Label htmlFor="salutation">Salutation</Label>
                  <Select
                    value={formData.salutation}
                    onValueChange={(value) =>
                      setFormData({ ...formData, salutation: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select salutation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mr">Mr</SelectItem>
                      <SelectItem value="Mrs">Mrs</SelectItem>
                      <SelectItem value="Ms">Ms</SelectItem>
                      <SelectItem value="Dr">Dr</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    placeholder="Patient name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="age">Age *</Label>
                    <Input
                      id="age"
                      type="number"
                      placeholder="Age"
                      value={formData.age}
                      onChange={(e) =>
                        setFormData({ ...formData, age: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="sex">Gender *</Label>
                    <Select
                      value={formData.sex}
                      onValueChange={(value) =>
                        setFormData({ ...formData, sex: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="patient@example.com"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="Phone number"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="ethnicity">Ethnicity</Label>
                    <Input
                      id="ethnicity"
                      placeholder="e.g., South Asian"
                      value={formData.ethnicity}
                      onChange={(e) =>
                        setFormData({ ...formData, ethnicity: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="occupation">Occupation</Label>
                    <Input
                      id="occupation"
                      placeholder="e.g., Teacher"
                      value={formData.occupation}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          occupation: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                {/* SDOH Section - Optional */}
                <div className="border-t pt-4 mt-4">
                  <div className="text-sm font-semibold mb-3">
                    Social Determinants of Health (Optional)
                  </div>
                  <div>
                    <Label htmlFor="smoking_status">Smoking Status</Label>
                    <Select
                      value={formData.smoking_status}
                      onValueChange={(value) =>
                        setFormData({ ...formData, smoking_status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select smoking status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Non-smoker">Non-smoker</SelectItem>
                        <SelectItem value="Former smoker">
                          Former smoker
                        </SelectItem>
                        <SelectItem value="Current smoker">
                          Current smoker
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-3">
                    <Label htmlFor="physical_activity">Physical Activity</Label>
                    <Select
                      value={formData.physical_activity}
                      onValueChange={(value) =>
                        setFormData({ ...formData, physical_activity: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select activity level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sedentary">Sedentary</SelectItem>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="mt-3">
                    <Label htmlFor="diet">Diet</Label>
                    <Input
                      id="diet"
                      placeholder="e.g., Balanced, High fat, Vegetarian"
                      value={formData.diet}
                      onChange={(e) =>
                        setFormData({ ...formData, diet: e.target.value })
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <Label htmlFor="hearing_impairment">
                      Hearing Impairment
                    </Label>
                    <Input
                      id="hearing_impairment"
                      placeholder="e.g., None, Uses hearing aids"
                      value={formData.hearing_impairment}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hearing_impairment: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="mt-3">
                    <Label htmlFor="access_to_healthcare">
                      Access to Healthcare
                    </Label>
                    <Select
                      value={formData.access_to_healthcare}
                      onValueChange={(value) =>
                        setFormData({
                          ...formData,
                          access_to_healthcare: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select access level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Good">Good</SelectItem>
                        <SelectItem value="Moderate">Moderate</SelectItem>
                        <SelectItem value="Limited">Limited</SelectItem>
                        <SelectItem value="Poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Vitals Section - Optional */}
                <div className="border-t pt-4 mt-4">
                  <div className="text-sm font-semibold mb-3">
                    Vitals (Optional)
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="weight_kg">Weight (kg)</Label>
                      <Input
                        id="weight_kg"
                        type="number"
                        step="0.1"
                        placeholder="Weight in kg"
                        value={formData.weight_kg}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            weight_kg: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="blood_pressure_mmHg">
                        Blood Pressure
                      </Label>
                      <Input
                        id="blood_pressure_mmHg"
                        placeholder="e.g., 120/80"
                        value={formData.blood_pressure_mmHg}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            blood_pressure_mmHg: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="heart_rate_bpm">Heart Rate (bpm)</Label>
                      <Input
                        id="heart_rate_bpm"
                        type="number"
                        placeholder="Heart rate"
                        value={formData.heart_rate_bpm}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            heart_rate_bpm: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor="spo2_percent">SpO2 (%)</Label>
                      <Input
                        id="spo2_percent"
                        type="number"
                        step="0.1"
                        placeholder="Oxygen saturation"
                        value={formData.spo2_percent}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            spo2_percent: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="temperature">Temperature (°F)</Label>
                      <Input
                        id="temperature"
                        type="number"
                        step="0.1"
                        placeholder="Temperature"
                        value={formData.temperature}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            temperature: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddPatientModal(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1"
                  >
                    {isSubmitting ? "Adding..." : "Add Patient"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
        </>
      )}
    </div>
  );
}
