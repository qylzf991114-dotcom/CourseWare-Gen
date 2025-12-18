import React, { useState } from 'react';
import { CheckCircle2, XCircle, Info, Trophy, ChevronRight, RotateCcw, Target, AlertCircle, PieChart as PieIcon } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
}

interface QuizModuleProps {
  dataString: string;
}

const SimplePieChart = ({ percentage, color }: { percentage: number, color: string }) => {
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className="relative w-20 h-20 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90">
        <circle cx="40" cy="40" r={radius} stroke="#e2e8f0" strokeWidth="6" fill="transparent" />
        <circle 
          cx="40" cy="40" r={radius} stroke={color} strokeWidth="6" fill="transparent" 
          strokeDasharray={circumference} 
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-black">{Math.round(percentage)}%</span>
    </div>
  );
};

export const QuizModule: React.FC<QuizModuleProps> = ({ dataString }) => {
  let questions: Question[] = [];
  try {
    questions = JSON.parse(dataString);
  } catch (e) {
    return <div className="p-10 text-center text-slate-400">测验数据加载失败，请尝试点击“重新生成”。</div>;
  }

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [results, setResults] = useState<{isCorrect: boolean, topic: string}[]>([]);

  const currentQuestion = questions[currentIndex];

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedOption(index);
  };

  const handleSubmit = () => {
    if (selectedOption === null) return;
    const isCorrect = selectedOption === currentQuestion.correctAnswer;
    if (isCorrect) setScore(s => s + 1);
    setResults(prev => [...prev, { isCorrect, topic: currentQuestion.topic }]);
    setShowResult(true);
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedOption(null);
      setShowResult(false);
    } else {
      setQuizFinished(true);
    }
  };

  const resetQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setShowResult(false);
    setScore(0);
    setQuizFinished(false);
    setResults([]);
  };

  if (quizFinished) {
    const accuracy = (score / questions.length) * 100;
    const topics = Array.from(new Set(questions.map(q => q.topic)));
    
    return (
      <div className="flex flex-col items-center justify-center py-10 animate-in zoom-in duration-500 max-w-4xl mx-auto px-4">
        <div className="w-20 h-20 bg-blue-600 rounded-3xl flex items-center justify-center text-white shadow-2xl mb-6">
          <Trophy size={40} />
        </div>
        <h2 className="text-3xl font-black text-slate-900 mb-2">De Anza 学习评估报告</h2>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-10">Quarter Review Completion</div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mb-10">
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <SimplePieChart percentage={accuracy} color="#2563eb" />
            <div className="mt-4">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Overall Accuracy</div>
              <div className="text-xl font-black text-slate-900">{score} / {questions.length}</div>
            </div>
          </div>

          <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-widest mb-4">
              <Target size={14} /> 已掌握知识模块
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.map(t => {
                const total = results.filter(r => r.topic === t).length;
                const correct = results.filter(r => r.topic === t && r.isCorrect).length;
                const isMastered = total > 0 && correct / total >= 0.8;
                if (!isMastered) return null;
                return (
                  <span key={t} className="bg-white px-3 py-1.5 rounded-xl text-[10px] font-black text-emerald-600 border border-emerald-200 flex items-center gap-1.5 shadow-sm">
                    <CheckCircle2 size={10} /> {t}
                  </span>
                );
              })}
              {topics.filter(t => results.filter(r => r.topic === t && r.isCorrect).length / results.filter(r => r.topic === t).length >= 0.8).length === 0 && <span className="text-slate-400 text-xs italic">暂无完全掌握的模块，建议针对性复习。</span>}
            </div>
            
            <div className="mt-6 flex items-center gap-2 text-rose-700 font-black text-[10px] uppercase tracking-widest mb-4">
              <AlertCircle size={14} /> 需重点加强
            </div>
            <div className="flex flex-wrap gap-2">
              {topics.map(t => {
                const total = results.filter(r => r.topic === t).length;
                const correct = results.filter(r => r.topic === t && r.isCorrect).length;
                const needsWork = total > 0 && correct / total < 0.8;
                if (!needsWork) return null;
                return (
                  <span key={t} className="bg-white px-3 py-1.5 rounded-xl text-[10px] font-black text-rose-600 border border-rose-200 flex items-center gap-1.5 shadow-sm">
                    <XCircle size={10} /> {t}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        <button onClick={resetQuiz} className="flex items-center gap-2 bg-slate-900 text-white px-10 py-4 rounded-2xl font-black hover:scale-105 transition-all shadow-xl active:scale-95">
          <RotateCcw size={18} /> 重新开始模拟练习
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto px-4 pb-20">
      <div className="mb-8 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Module: {currentQuestion.topic}</span>
          <span className="text-sm font-bold text-slate-400">Question {currentIndex + 1} / {questions.length}</span>
        </div>
        <div className="flex gap-1.5">
          {questions.map((_, i) => (
            <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${i === currentIndex ? 'bg-blue-600 w-10' : i < currentIndex ? 'bg-blue-200' : 'bg-slate-200'}`}></div>
          ))}
        </div>
      </div>

      <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-50 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5">
            <PieIcon size={120} />
        </div>
        
        <h3 className="text-2xl font-black text-slate-800 mb-10 leading-snug relative z-10">
          {currentQuestion.question}
        </h3>

        <div className="space-y-4 mb-10 relative z-10">
          {currentQuestion.options.map((option, idx) => {
            let stateStyle = "bg-slate-50 border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 text-slate-600";
            if (selectedOption === idx) stateStyle = "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-600/30";
            
            if (showResult) {
              if (idx === currentQuestion.correctAnswer) stateStyle = "bg-emerald-500 border-emerald-500 text-white shadow-xl shadow-emerald-500/30";
              else if (selectedOption === idx) stateStyle = "bg-rose-500 border-rose-500 text-white shadow-xl shadow-rose-500/30";
              else stateStyle = "bg-slate-50 border-slate-100 opacity-40 text-slate-400";
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={showResult}
                className={`w-full text-left p-6 rounded-[1.5rem] border-2 font-bold transition-all flex items-center gap-5 ${stateStyle}`}
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm shrink-0 font-black ${selectedOption === idx ? 'bg-white/20' : 'bg-slate-200/50 text-slate-500'}`}>
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="leading-relaxed">{option}</span>
              </button>
            );
          })}
        </div>

        {!showResult ? (
          <button
            onClick={handleSubmit}
            disabled={selectedOption === null}
            className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 disabled:opacity-10 transition-all active:scale-95"
          >
            提交答案并查看解析
          </button>
        ) : (
          <div className="animate-in slide-in-from-bottom-6 duration-500">
            <div className={`p-10 rounded-[2rem] border-2 flex flex-col gap-6 mb-8 ${selectedOption === currentQuestion.correctAnswer ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              <div className="flex items-center gap-3 font-black text-xs uppercase tracking-widest opacity-80">
                {selectedOption === currentQuestion.correctAnswer ? <CheckCircle2 size={18} className="text-emerald-500" /> : <XCircle size={18} className="text-rose-500" />}
                {selectedOption === currentQuestion.correctAnswer ? "Correct! 太棒了，完全正确" : "Incorrect! 这里有个小陷阱"}
              </div>
              <div className="flex gap-4">
                <div className="shrink-0 w-1 bg-current opacity-20 rounded-full" />
                <div className="text-base font-bold leading-relaxed whitespace-pre-wrap">
                  {currentQuestion.explanation}
                </div>
              </div>
            </div>
            <button
              onClick={handleNext}
              className="w-full bg-blue-600 text-white py-5 rounded-[1.5rem] font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-blue-700 transition-all flex items-center justify-center gap-3 active:scale-95"
            >
              {currentIndex < questions.length - 1 ? '继续下一题' : '查看最终评估报告'} <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};