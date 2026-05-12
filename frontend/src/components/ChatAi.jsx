import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import axiosClient from "../utils/axiosClient";
import { Send } from 'lucide-react';

function ChatAi({ problem }) {
    // FIX 1: No hardcoded test messages — start with a proper greeting
    const [messages, setMessages] = useState([
        { role: 'model', parts: [{ text: `Hi! I'm your DSA tutor for "${problem?.title}". Ask me for hints, code review, or an explanation of the approach!` }] }
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm();
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const onSubmit = async (data) => {
        const userMessage = { role: 'user', parts: [{ text: data.message }] };

        // FIX 2: Build the updated messages list first, then use it for the API call.
        // Previously `messages` was stale — the new user message wasn't included
        // in the API request because setMessages is async.
        const updatedMessages = [...messages, userMessage];

        setMessages(updatedMessages);
        reset();
        setIsLoading(true);

        try {
            const response = await axiosClient.post("/ai/chat", {
                messages: updatedMessages,   // send the full up-to-date history
                title: problem.title,
                description: problem.description,
                testCases: problem.visibleTestCases,
                startCode: problem.startCode
            });

            setMessages(prev => [...prev, {
                role: 'model',
                parts: [{ text: response.data.message }]
            }]);
        } catch (error) {
            console.error("API Error:", error);
            const is401 = error.response?.status === 401;
            setMessages(prev => [...prev, {
                role: 'model',
                parts: [{
                    text: is401
                        ? "Your session has expired. Please log in again to use the AI tutor."
                        : "Sorry, something went wrong. Please try again."
                }]
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-screen max-h-[80vh] min-h-[500px]">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`chat ${msg.role === "user" ? "chat-end" : "chat-start"}`}
                    >
                        <div className="chat-bubble bg-base-200 text-base-content whitespace-pre-wrap">
                            {msg.parts[0].text}
                        </div>
                    </div>
                ))}

                {/* Loading indicator while waiting for AI response */}
                {isLoading && (
                    <div className="chat chat-start">
                        <div className="chat-bubble bg-base-200 text-base-content">
                            <span className="loading loading-dots loading-sm"></span>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <form
                onSubmit={handleSubmit(onSubmit)}
                className="sticky bottom-0 p-4 bg-base-100 border-t"
            >
                <div className="flex items-center gap-2">
                    <input
                        placeholder="Ask for a hint, code review, or approach..."
                        className="input input-bordered flex-1"
                        disabled={isLoading}
                        {...register("message", { required: true, minLength: 2 })}
                    />
                    <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={isLoading || !!errors.message}
                    >
                        <Send size={20} />
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ChatAi;