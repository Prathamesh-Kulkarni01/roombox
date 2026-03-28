import fs from 'fs';
import path from 'path';
import { Badge } from '@/components/ui/badge';
import { Bot, CalendarDays, CodeXml, GitCommit, Rocket, Sparkles } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Changelog | RoomBox',
  description: 'Track the latest updates, features, and fixes in RoomBox.',
}

interface VersionLog {
  version: string;
  date: string;
  impact: string;
  features: string[];
  others: string[];
}

function parseChangelog(content: string): VersionLog[] {
  const versions = content.split('## Version ').filter(v => v.trim().length > 0);
  
  return versions.map(block => {
    const lines = block.split('\n');
    const headerMatch = lines[0].match(/(.*?)\s*\((.*?)\)/);
    const version = headerMatch ? headerMatch[1].trim() : lines[0].trim();
    const date = headerMatch ? headerMatch[2].trim() : '';

    let impact = '';
    const features: string[] = [];
    const others: string[] = [];
    
    let currentSection = '';
    let isImpactBlock = false;

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line && !isImpactBlock) continue;

        if (line.startsWith('### 🔄 Semantic Impact') || line.startsWith('### Semantic Impact')) {
            currentSection = 'impact';
            continue;
        } else if (line.startsWith('### ✨ Features') || line.startsWith('### Features')) {
            currentSection = 'features';
            continue;
        } else if (line.startsWith('### 📝 Other Commits') || line.startsWith('### Other Commits')) {
            currentSection = 'others';
            continue;
        } else if (line.startsWith('###')) { 
            currentSection = 'others';
            continue;
        }

        if (currentSection === 'impact') {
            if (line.startsWith('```')) {
                isImpactBlock = !isImpactBlock;
                continue;
            }
            if (isImpactBlock) {
                impact += lines[i] + '\n'; 
            } else if (!line.startsWith('```') && line) {
                impact += line + '\n';
            }
        } else if (currentSection === 'features' && line.startsWith('- ')) {
            features.push(line.substring(2));
        } else if (currentSection === 'others' && line.startsWith('- ')) {
            others.push(line.substring(2));
        }
    }

    return { version, date, impact: impact.trim(), features, others };
  });
}

export default async function ChangelogPage() {
  let changelogContent = '';
  try {
    changelogContent = fs.readFileSync(path.join(process.cwd(), 'CHANGELOG.md'), 'utf-8');
  } catch (error) {
    changelogContent = '';
  }

  const logs = parseChangelog(changelogContent);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-foreground pb-20 selection:bg-primary/30">
        
      {/* Premium Header */}
      <div className="relative overflow-hidden bg-white dark:bg-slate-900 border-b border-border shadow-sm">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-primary/20 opacity-20 blur-[100px]"></div>
        <div className="container max-w-5xl py-20 px-4 sm:px-6 lg:px-8 mx-auto relative z-10 text-center">
          <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary hover:bg-primary/20 transition-colors uppercase tracking-widest text-xs font-bold px-3 py-1">
            <Rocket className="w-4 h-4 mr-2 inline-block" /> Product Updates
          </Badge>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-slate-800 to-slate-500 dark:from-white dark:via-slate-200 dark:to-slate-400">
            What's New in RoomBox
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Follow our journey as we continuously improve RoomBox. Discover the latest features, enhancements, and bug fixes straight from our engineers.
          </p>
        </div>
      </div>

      <div className="container max-w-4xl py-16 px-4 sm:px-6 lg:px-8 mx-auto">
        <div className="space-y-16">
          {logs.map((log, index) => (
            <div key={log.version} className="relative group">
              
              {/* Timeline Connector */}
              {index !== logs.length - 1 && (
                  <div className="hidden sm:block absolute top-[3rem] bottom-[-4rem] left-[5rem] w-[2px] bg-gradient-to-b from-border to-transparent -z-10"></div>
              )}

              <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
                
                {/* Visual Indicator & Date */}
                <div className="flex flex-row sm:flex-col gap-4 sm:w-40 shrink-0 relative mt-1 items-center sm:items-end sm:text-right">
                  <div className="flex sm:hidden items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-slate-100 dark:bg-slate-800 text-slate-500 shadow-sm shrink-0 z-10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary/20">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col pt-1 sm:pt-0 sm:pr-4 relative w-full sm:w-auto">
                    {/* Desktop timeline dot */}
                    <div className="hidden sm:flex absolute right-[-2.3rem] top-1 items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-slate-100 dark:bg-slate-800 text-slate-500 shadow-sm shrink-0 z-10 transition-colors group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary/20">
                      <Bot className="h-5 w-5" />
                    </div>

                    {index === 0 && (
                        <div className="mb-2">
                             <Badge className="bg-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/20 text-white border-0 font-bold uppercase tracking-wider text-[10px]">Latest Release</Badge>
                        </div>
                    )}
                    <div className="text-2xl font-black tracking-tight text-foreground">
                        v{log.version}
                    </div>
                    <div className="flex items-center sm:justify-end text-sm font-semibold text-muted-foreground mt-1">
                        <CalendarDays className="h-4 w-4 mr-1.5 opacity-70" />
                        {log.date || 'Unknown Date'}
                    </div>
                  </div>
                </div>
                
                {/* Content Card */}
                <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-sm border border-border/70 hover:shadow-md hover:border-primary/30 transition-all duration-300 relative overflow-hidden group-hover:shadow-primary/5">
                  
                  {/* Decorative background element */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -z-10 transition-transform group-hover:scale-110"></div>

                  <div className="space-y-8 relative z-10">
                    {/* Features */}
                    {log.features.length > 0 && (
                       <div>
                          <h3 className="text-xs font-black uppercase tracking-widest text-primary flex items-center mb-5 bg-primary/5 w-fit px-3 py-1.5 rounded-lg border border-primary/10">
                             <Sparkles className="h-4 w-4 mr-2" /> Features & Improvements
                          </h3>
                          <ul className="space-y-4">
                             {log.features.map((feature, i) => {
                                const boldedFeature = feature.replace(/^(feat|fix|chore|refactor|docs|style|test|perf|build|ci|revert):/i, '<strong class="capitalize bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded mr-1.5 inline-block text-[11px] font-black tracking-wider shadow-sm border border-slate-200 dark:border-slate-700 text-foreground">$1</strong>');
                                
                                return (
                                <li key={i} className="flex gap-4 text-[15px] sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed items-start">
                                   <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-2.5 shadow-sm shadow-primary/30"></div>
                                   <span dangerouslySetInnerHTML={{ __html: boldedFeature.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-primary text-[13px] font-bold font-mono border border-border/50">$1</code>') }} className="flex-1 block mt-0.5" />
                                </li>
                             )})}
                          </ul>
                       </div>
                    )}

                    {/* Other Commits */}
                    {log.others.length > 0 && (
                       <div>
                          <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 flex items-center mb-5 bg-slate-100 dark:bg-slate-800/80 w-fit px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                             <GitCommit className="h-4 w-4 mr-2" /> Other Changes
                          </h3>
                          <ul className="space-y-3">
                             {log.others.map((other, i) => {
                                const boldedOther = other.replace(/^(feat|fix|chore|refactor|docs|style|test|perf|build|ci|revert):/i, '<strong class="capitalize bg-white dark:bg-slate-950 px-1.5 py-0.5 rounded mr-1.5 inline-block text-[10px] font-black tracking-wider shadow-sm border border-slate-200 dark:border-slate-800 text-muted-foreground">$1</strong>');
                                return (
                                <li key={i} className="flex gap-4 text-sm text-slate-500 dark:text-slate-400 leading-relaxed items-start">
                                   <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700 shrink-0 mt-2"></div>
                                   <span dangerouslySetInnerHTML={{ __html: boldedOther.replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-foreground/80 text-[12px] font-bold font-mono border border-border/50">$1</code>') }} className="flex-1 block" />
                                </li>
                             )})}
                          </ul>
                       </div>
                    )}

                    {/* Impact Summary */}
                    {log.impact && (
                       <div className="pt-6 border-t border-border/60">
                          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center mb-4">
                             <CodeXml className="h-3.5 w-3.5 mr-2 opacity-70" /> Impact Summary
                          </h3>
                          <div className="bg-[#0f111a] overflow-hidden rounded-xl border border-slate-800 shadow-inner group/code">
                             <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-[#161925]">
                                <div className="flex space-x-1.5">
                                   <div className="w-2.5 h-2.5 rounded-full bg-red-500/80"></div>
                                   <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80"></div>
                                   <div className="w-2.5 h-2.5 rounded-full bg-green-500/80"></div>
                                </div>
                                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Git Diff</span>
                             </div>
                             <pre className="text-[12px] leading-relaxed text-slate-300 overflow-x-auto p-5 font-mono w-full scrollbar-thin scrollbar-thumb-slate-700">
                                {log.impact.split('\n').map((line, idx) => {
                                  // Add color to diff lines based on leading character
                                  let colorClass = 'text-slate-300';
                                  if (line.match(/^.*\s\|\s.*\-.*$/)) {
                                    // File change stat line
                                  } else if (line.trim().startsWith('+')) {
                                    colorClass = 'text-emerald-400';
                                  } else if (line.trim().startsWith('-')) {
                                    colorClass = 'text-red-400';
                                  } else if (line.trim().match(/^\d+ files? changed/)) {
                                    colorClass = 'text-amber-300 font-semibold';
                                  }
                                  
                                  return (
                                    <span key={idx} className={`block ${colorClass}`}>{line}</span>
                                  )
                                })}
                             </pre>
                          </div>
                       </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {logs.length === 0 && (
             <div className="text-center py-24 bg-white dark:bg-slate-900 rounded-3xl border border-border/60 hover:border-primary/50 transition-colors shadow-sm border-dashed">
                <div className="mx-auto w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
                    <Rocket className="h-8 w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-2xl font-black text-foreground mb-2">No updates yet</h3>
                <p className="text-muted-foreground font-medium max-w-sm mx-auto leading-relaxed">We're working hard on our first release. Stay tuned for exciting new features and improvements.</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
