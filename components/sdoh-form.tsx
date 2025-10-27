import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export const SDOHForm = () => (
  <div className="h-full overflow-hidden">
    <div className="h-full overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-muted [&::-webkit-scrollbar-thumb]:rounded-full">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {/* Housing */}
        <Card>
          {/* <CardHeader>
            <CardTitle className="text-xs">Housing</CardTitle>
          </CardHeader> */}
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="housing-status" className="text-xs">
                Housing Status
              </Label>
              <Select>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="owned">Owned</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                  <SelectItem value="homeless">Homeless</SelectItem>
                  <SelectItem value="temporary">Temporary</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="household-size" className="text-xs">
                Household Size
              </Label>
              <Input
                id="household-size"
                type="number"
                className="h-8 w-full"
                placeholder="Number of people"
              />
            </div>
          </CardContent>
        </Card>

        {/* Employment */}
        <Card>
          {/* <CardHeader>
            <CardTitle className="text-xs">Employment</CardTitle>
          </CardHeader> */}
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="employment-status" className="text-xs">
                Employment Status
              </Label>
              <Select>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employed">Employed</SelectItem>
                  <SelectItem value="unemployed">Unemployed</SelectItem>
                  <SelectItem value="retired">Retired</SelectItem>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="occupation" className="text-xs">
                Occupation
              </Label>
              <Input
                id="occupation"
                className="h-8 w-full"
                placeholder="Current occupation"
              />
            </div>
          </CardContent>
        </Card>

        {/* Education */}
        <Card>
          {/* <CardHeader>
            <CardTitle className="text-xs">Education</CardTitle>
          </CardHeader> */}
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="education-level" className="text-xs">
                Education Level
              </Label>
              <Select>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No formal education</SelectItem>
                  <SelectItem value="elementary">Elementary</SelectItem>
                  <SelectItem value="high-school">High School</SelectItem>
                  <SelectItem value="college">College</SelectItem>
                  <SelectItem value="graduate">Graduate</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="literacy" className="text-xs">
                Literacy Level
              </Label>
              <Select>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select literacy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proficient">Proficient</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Social Support
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Social Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="marital-status" className="text-xs">
                Marital Status
              </Label>
              <Select>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="single">Single</SelectItem>
                  <SelectItem value="married">Married</SelectItem>
                  <SelectItem value="divorced">Divorced</SelectItem>
                  <SelectItem value="widowed">Widowed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="support-network" className="text-xs">
                Support Network
              </Label>
              <Select>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select network" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strong">Strong</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="limited">Limited</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        //Transportation
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Transportation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="transportation" className="text-xs">
                Transportation Access
              </Label>
              <Select>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select access" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="personal-vehicle">
                    Personal Vehicle
                  </SelectItem>
                  <SelectItem value="public-transport">
                    Public Transport
                  </SelectItem>
                  <SelectItem value="walking">Walking</SelectItem>
                  <SelectItem value="limited">Limited Access</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="distance-to-care" className="text-xs">
                Distance to Care (miles)
              </Label>
              <Input
                id="distance-to-care"
                type="number"
                className="h-8 w-full"
                placeholder="Miles"
              />
            </div>
          </CardContent>
        </Card>

        //Financial
        <Card>
          <CardHeader>
            <CardTitle className="text-xs">Financial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label htmlFor="income-level" className="text-xs">
                Income Level
              </Label>
              <Select>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="below-poverty">
                    Below Poverty Line
                  </SelectItem>
                  <SelectItem value="low">Low Income</SelectItem>
                  <SelectItem value="middle">Middle Income</SelectItem>
                  <SelectItem value="high">High Income</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="insurance" className="text-xs">
                Health Insurance
              </Label>
              <Select>
                <SelectTrigger className="h-8 w-full">
                  <SelectValue placeholder="Select coverage" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="private">Private</SelectItem>
                  <SelectItem value="medicare">Medicare</SelectItem>
                  <SelectItem value="medicaid">Medicaid</SelectItem>
                  <SelectItem value="uninsured">Uninsured</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card> */}

        {/* Additional Notes - Full Width */}
        <Card className="md:col-span-2 lg:col-span-3 pt-0">
          {/* <CardHeader>
            <CardTitle className="text-xs">Additional Notes</CardTitle>
          </CardHeader> */}
          <CardContent>
            <Textarea
              placeholder="Enter any additional SDOH-related information..."
              className="min-h-20 resize-none w-full"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  </div>
);
