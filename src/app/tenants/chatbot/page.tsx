
'use client'

import { useState, useRef, useEffect } from "react"
import { useData } from "@/context/data-provider"
import { askPgChatbot, type AskPgChatbotInput } from "@/ai/flows/ask-pg-chatbot"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Bot, Send, User } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"

interface Message {
    role: 'user' | 'bot';
    text: string;
}

export default function ChatbotPage() {
    const { currentPg, currentUser, isLoading } = useData()
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isGenerating, setIsGenerating] = useState(false)
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!input.trim() || !currentPg || isGenerating) return

        const userMessage: Message = { role: 'user', text: input }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsGenerating(true)

        try {
            const chatbotInput: AskPgChatbotInput = {
                question: input,
                pgContext: {
                    name: currentPg.name,
                    rules: currentPg.rules,
                    amenities: currentPg.amenities,
                    menu: currentPg.menu || {},
                }
            }
            const result = await askPgChatbot(chatbotInput)
            const botMessage: Message = { role: 'bot', text: result.answer }
            setMessages(prev => [...prev, botMessage])
        } catch (error) {
            console.error("Error calling chatbot flow", error)
            const errorMessage: Message = { role: 'bot', text: "Sorry, I'm having trouble connecting. Please try again later." }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsGenerating(false)
        }
    }

    if (isLoading) {
        return <Skeleton className="h-[70vh] w-full" />
    }

    return (
        <div className="flex justify-center items-start h-full">
            <Card className="w-full max-w-3xl h-[calc(100vh-150px)] flex flex-col">
                <CardHeader className="border-b">
                    <CardTitle className="flex items-center gap-2">
                        <Bot className="text-primary" /> AI Helper for {currentPg?.name}
                    </CardTitle>
                    <CardDescription>Ask me about rules, timings, or the menu. (100 messages/week limit)</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                            <p className="font-semibold">Ask me anything!</p>
                            <p className="text-sm">e.g., "What's for dinner tonight?" or "What are the visitor hours?"</p>
                        </div>
                    ) : (
                         messages.map((msg, index) => (
                            <div key={index} className={cn("flex items-start gap-3", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                                {msg.role === 'bot' && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarFallback><Bot /></AvatarFallback>
                                    </Avatar>
                                )}
                                <div className={cn("max-w-sm md:max-w-md rounded-lg px-4 py-2", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                                </div>
                                 {msg.role === 'user' && currentUser && (
                                    <Avatar className="h-8 w-8">
                                        <AvatarImage src={currentUser.avatarUrl} />
                                        <AvatarFallback>{currentUser.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                        ))
                    )}
                     {isGenerating && (
                        <div className="flex items-start gap-3 justify-start">
                             <Avatar className="h-8 w-8"><AvatarFallback><Bot /></AvatarFallback></Avatar>
                             <div className="max-w-sm md:max-w-md rounded-lg px-4 py-2 bg-muted">
                                <Skeleton className="h-4 w-24" />
                             </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="border-t pt-4">
                    <form onSubmit={handleSendMessage} className="flex w-full items-center space-x-2">
                        <Input
                            placeholder="Type your question..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            disabled={isGenerating}
                        />
                        <Button type="submit" disabled={isGenerating || !input.trim()}>
                            <Send className="w-4 h-4" />
                            <span className="sr-only">Send</span>
                        </Button>
                    </form>
                </CardFooter>
            </Card>
        </div>
    )
}
