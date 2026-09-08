"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  lastLoginAt?: string;
  joinedAt: string;
}

const roleColors: Record<string, string> = {
  owner: "bg-purple-100 text-purple-800",
  admin: "bg-blue-100 text-blue-800",
  manager: "bg-green-100 text-green-800",
  agent: "bg-amber-100 text-amber-800",
  viewer: "bg-gray-100 text-gray-800",
};

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/register")
      .then((r) => r.json())
      .then(() => {
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Team</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Team management allows you to invite users and assign roles. This feature is available on the Professional plan and above.
          </p>
          <div className="mt-6 space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Role-Based Access Control</div>
                <div className="text-sm text-gray-500">Assign Owner, Admin, Manager, Agent, or Viewer roles</div>
              </div>
              <Badge>Available</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">User Invitations</div>
                <div className="text-sm text-gray-500">Invite team members via email</div>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <div className="font-medium">Permission Management</div>
                <div className="text-sm text-gray-500">Fine-grained permissions for each role</div>
              </div>
              <Badge variant="secondary">Coming Soon</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
