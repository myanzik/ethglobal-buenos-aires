import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { DollarSign, GitPullRequest, Trophy, Coins, Github, Target } from "lucide-react"
import Image from "next/image"

export default function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
              <span className="text-secondary-foreground font-bold text-xl">G</span>
            </div>
            <span className="text-2xl font-bold text-primary">GITHUNDER</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost">How It Works</Button>
            <Button variant="ghost">For Funders</Button>
            <Button variant="ghost">For Contributors</Button>
            <Button>Launch App</Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-block px-4 py-2 bg-primary/10 rounded-full mb-6">
              <span className="text-primary font-semibold text-sm">Fight Bugs ⚔️ Win Tokens</span>
            </div>
            <h1 className="text-5xl lg:text-6xl font-bold mb-6 text-balance leading-tight">
              Open Source Bounties Made <span className="text-primary">Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 text-pretty leading-relaxed">
              Transform how you fund open source development. Add bounties to GitHub issues and automatically reward
              contributors who solve them.
            </p>
            <div className="flex gap-4">
              <Button size="lg" className="text-lg px-8">
                Get Started
              </Button>
              <Button size="lg" variant="outline" className="text-lg px-8 bg-transparent">
                View Demo
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">Even the smallest can make a big impact</p>
          </div>
          <div className="relative">
            <div className="bg-card border-4 border-secondary rounded-2xl p-8 shadow-2xl">
              <Image
                src="/githunder.png"
                alt="Githunder Mascot - Fight Bugs, Win Tokens"
                width={600}
                height={400}
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-card border-y border-border py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">How Githunder Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Three simple steps to incentivize open source contributions
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <DollarSign className="w-8 h-8 text-primary" />
                </div>
                <div className="text-primary font-bold text-sm mb-2">STEP 1</div>
                <h3 className="text-2xl font-bold mb-4">Funders Add Bounties</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Companies or individuals attach bounties to GitHub issues. Set the reward amount and watch
                  contributors line up to solve your problems.
                </p>
              </CardContent>
            </Card>

            {/* Step 2 */}
            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <GitPullRequest className="w-8 h-8 text-primary" />
                </div>
                <div className="text-primary font-bold text-sm mb-2">STEP 2</div>
                <h3 className="text-2xl font-bold mb-4">Contributors Solve</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Developers browse bounties, pick issues they can solve, and submit pull requests. Quality
                  contributions get merged faster.
                </p>
              </CardContent>
            </Card>

            {/* Step 3 */}
            <Card className="border-2 hover:border-primary transition-colors">
              <CardContent className="p-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <Trophy className="w-8 h-8 text-primary" />
                </div>
                <div className="text-primary font-bold text-sm mb-2">STEP 3</div>
                <h3 className="text-2xl font-bold mb-4">Rewards Distributed</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Once merged, bounties are automatically distributed among contributors. Fair, transparent, and instant
                  payment.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-4xl font-bold mb-6">For Funders</h2>
            <p className="text-xl text-muted-foreground mb-8">Get your issues solved faster with targeted incentives</p>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Prioritize Critical Issues</h3>
                  <p className="text-muted-foreground">
                    Add higher bounties to urgent bugs and features to attract top talent immediately.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Github className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">GitHub Integration</h3>
                  <p className="text-muted-foreground">
                    Seamlessly connects with your existing workflow. No need to change how you work.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold mb-2">Transparent Spending</h3>
                  <p className="text-muted-foreground">
                    Track every dollar spent and see exactly what results you get for your investment.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-muted rounded-2xl p-8 border-2 border-border">
            <div className="aspect-square bg-card rounded-xl flex items-center justify-center border-2 border-primary/20">
              <div className="text-center">
                <Coins className="w-24 h-24 text-primary mx-auto mb-4" />
                <p className="text-2xl font-bold">$50,000+</p>
                <p className="text-muted-foreground">In Bounties Distributed</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* For Contributors Section */}
      <section className="bg-card border-y border-border py-20">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <div className="bg-secondary/5 rounded-2xl p-8 border-2 border-secondary/20">
                <div className="space-y-4">
                  <div className="bg-card p-4 rounded-lg border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <GitPullRequest className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">Fix login bug</div>
                        <div className="text-sm text-muted-foreground">#234</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">$500</div>
                      <div className="text-xs text-muted-foreground">bounty</div>
                    </div>
                  </div>
                  <div className="bg-card p-4 rounded-lg border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <GitPullRequest className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">Add dark mode</div>
                        <div className="text-sm text-muted-foreground">#187</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">$1,200</div>
                      <div className="text-xs text-muted-foreground">bounty</div>
                    </div>
                  </div>
                  <div className="bg-card p-4 rounded-lg border border-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <GitPullRequest className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-semibold">API rate limiting</div>
                        <div className="text-sm text-muted-foreground">#156</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-primary">$800</div>
                      <div className="text-xs text-muted-foreground">bounty</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl font-bold mb-6">For Contributors</h2>
              <p className="text-xl text-muted-foreground mb-8">Get paid for your open source contributions</p>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Coins className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Earn While You Learn</h3>
                    <p className="text-muted-foreground">
                      Build your portfolio and get paid at the same time. Perfect for developers at any level.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Trophy className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Fair Compensation</h3>
                    <p className="text-muted-foreground">
                      Transparent reward distribution ensures everyone gets their fair share of the bounty.
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Choose Your Battles</h3>
                    <p className="text-muted-foreground">
                      Browse available bounties and pick issues that match your skills and interests.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 container mx-auto px-4">
        <div className="bg-secondary text-secondary-foreground rounded-3xl p-12 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to Transform Open Source?</h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Join thousands of developers and companies using Githunder to build better software together.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 bg-secondary-foreground text-secondary hover:bg-secondary-foreground/90"
            >
              Start Adding Bounties
            </Button>
            <Button size="lg" className="text-lg px-8 bg-primary text-primary-foreground hover:bg-primary/90">
              Browse Issues
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-secondary rounded flex items-center justify-center">
                  <span className="text-secondary-foreground font-bold">G</span>
                </div>
                <span className="text-xl font-bold">GITHUNDER</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Rewarding open source contributions, one bounty at a time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    How it Works
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Pricing
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    About
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Contact
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <a href="#" className="hover:text-foreground">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Terms
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-foreground">
                    Security
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 Githunder. All rights reserved. Fight bugs, win tokens.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
