import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageCircle, HelpCircle, FileText, Clock } from "lucide-react";
import { useLocation } from "wouter";

export default function Support() {
  const [, navigate] = useLocation();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Customer Support</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Contact Methods */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contact Us</CardTitle>
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4" />
                <span className="text-sm">help.subveris@gmail.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span className="text-sm">24/7 Support Available</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Frequently Asked</CardTitle>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="ghost" className="w-full justify-start h-auto p-2">
                <div className="text-left">
                  <div className="font-medium text-sm">How do I add a subscription?</div>
                  <div className="text-xs text-muted-foreground">Learn to track your subscriptions</div>
                </div>
              </Button>
              <Button variant="ghost" className="w-full justify-start h-auto p-2">
                <div className="text-left">
                  <div className="font-medium text-sm">Canceling a subscription</div>
                  <div className="text-xs text-muted-foreground">Step-by-step guide</div>
                </div>
              </Button>
              <Button variant="ghost" className="w-full justify-start h-auto p-2">
                <div className="text-left">
                  <div className="font-medium text-sm">Understanding insights</div>
                  <div className="text-xs text-muted-foreground">How to read your data</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documentation */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Documentation</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/docs#user-guide')}>
                <FileText className="h-4 w-4 mr-2" />
                User Guide
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/docs#api-documentation')}>
                <FileText className="h-4 w-4 mr-2" />
                API Documentation
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/docs#troubleshooting')}>
                <FileText className="h-4 w-4 mr-2" />
                Troubleshooting
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form */}
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Send us a message</CardTitle>
          <CardDescription>
            Need help? Fill out our contact form and we'll get back to you within 24 hours.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => navigate('/contact')} className="w-full md:w-auto">
            <Mail className="h-4 w-4 mr-2" />
            Go to Contact Form
          </Button>
        </CardContent>
      </Card>

      {/* Response Time */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-4">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <h3 className="font-semibold">Response Time</h3>
              <p className="text-sm text-muted-foreground">
                We typically respond to all inquiries within 24 hours during business days.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}