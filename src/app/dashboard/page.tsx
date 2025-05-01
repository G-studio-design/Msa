import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react';

// Mock data - Replace with actual data fetching based on user role
const tasks = [
  { id: 1, title: "Project Alpha - Phase 1", status: "Completed", progress: 100, assignedDivision: "Owner", nextAction: null },
  { id: 2, title: "Project Beta - Design Specs", status: "In Progress", progress: 60, assignedDivision: "Architect", nextAction: "Submit Design Files" },
  { id: 3, title: "Project Gamma - Offer Prep", status: "Pending Approval", progress: 20, assignedDivision: "Project Admin", nextAction: "Owner Review" },
  { id: 4, title: "Project Delta - Structure Plan", status: "Delayed", progress: 45, assignedDivision: "Structure", nextAction: "Upload Structure Files" },
  { id: 5, title: "Project Epsilon - Canceled", status: "Canceled", progress: 10, assignedDivision: "Owner", nextAction: null },
  { id: 6, title: "Project Zeta - Admin Setup", status: "Pending", progress: 5, assignedDivision: "General Admin", nextAction: "Generate DP Invoice" },
];

// Helper function to get status icon and color
const getStatusBadge = (status: string) => {
  switch (status.toLowerCase()) {
    case 'completed':
      return <Badge variant="default" className="bg-green-500 hover:bg-green-600"><CheckCircle className="mr-1 h-3 w-3" />Completed</Badge>;
    case 'in progress':
      return <Badge variant="secondary" className="bg-blue-500 text-white hover:bg-blue-600"><Clock className="mr-1 h-3 w-3" />In Progress</Badge>;
    case 'pending approval':
      return <Badge variant="outline" className="border-yellow-500 text-yellow-600"><AlertTriangle className="mr-1 h-3 w-3" />Pending Approval</Badge>;
    case 'delayed':
      return <Badge variant="destructive" className="bg-orange-500 hover:bg-orange-600"><Clock className="mr-1 h-3 w-3" />Delayed</Badge>;
     case 'canceled':
       return <Badge variant="destructive"><XCircle className="mr-1 h-3 w-3" />Canceled</Badge>;
     case 'pending':
        return <Badge variant="secondary"><Clock className="mr-1 h-3 w-3" />Pending</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
};

export default function DashboardPage() {
  // TODO: Fetch tasks based on user role (Admin sees all, others see relevant tasks)
  const userRole = "General Admin"; // Replace with actual role

  const filteredTasks = userRole === 'General Admin' || userRole === 'Owner'
    ? tasks // Admins and Owner see all
    : tasks.filter(task => task.assignedDivision === userRole || task.nextAction?.includes(userRole)); // Other roles see tasks assigned to them or requiring their action


  const activeTasks = filteredTasks.filter(task => task.status !== 'Completed' && task.status !== 'Canceled');
  const completedTasksCount = filteredTasks.filter(task => task.status === 'Completed').length;
  const pendingTasksCount = filteredTasks.filter(task => task.status === 'Pending' || task.status === 'Pending Approval').length;


  return (
    <div className="container mx-auto py-4">
      <h1 className="text-3xl font-bold mb-6 text-primary">Dashboard</h1>

       {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTasks.length}</div>
            <p className="text-xs text-muted-foreground">Tasks currently in progress or pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedTasksCount}</div>
             <p className="text-xs text-muted-foreground">Tasks successfully finished</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingTasksCount}</div>
            <p className="text-xs text-muted-foreground">Tasks awaiting approval or next step</p>
          </CardContent>
        </Card>
      </div>

       {/* Task List */}
      <Card>
         <CardHeader>
           <CardTitle>Task Overview</CardTitle>
           <CardDescription>
             {userRole === 'General Admin' || userRole === 'Owner' ? 'All tasks across divisions.' : `Tasks relevant to the ${userRole} division.`}
           </CardDescription>
         </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No tasks found.</p>
            ) : (
              filteredTasks.map((task) => (
                <Card key={task.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                     <div>
                       <CardTitle className="text-lg">{task.title}</CardTitle>
                       <CardDescription className="text-xs text-muted-foreground">
                         Assigned to: {task.assignedDivision} {task.nextAction ? `| Next: ${task.nextAction}` : ''}
                       </CardDescription>
                     </div>
                    {getStatusBadge(task.status)}
                  </CardHeader>
                  <CardContent>
                     {task.status !== 'Canceled' && (
                      <Progress value={task.progress} className="w-full h-2" />
                     )}
                     {task.status === 'Canceled' && (
                        <p className="text-sm text-destructive font-medium">This task was canceled.</p>
                     )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
