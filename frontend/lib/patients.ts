export interface Patient {
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

export const mockPatients: Patient[] = [
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
