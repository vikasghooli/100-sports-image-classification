import { ArrowDown } from "lucide-react";
import { Card, PageHeader } from "../components/ui";

const flow = ["Image/Camera", "Preprocessing", "Trained Deep Learning Model", "Sport Prediction", "Confidence/Top Predictions", "History/Analytics"];

export default function About() {
  return (
    <>
      <PageHeader title="About" />
      <div className="space-y-5">
        <Card title="Project">
          <p className="text-slate-600">100 Sports Image Classification is a local web application that serves a deep-learning model for recognising 100 sports from images. The model was trained separately by the project author; this application only loads the trained model and uses it for prediction. It does not train anything.</p>
        </Card>
        <Card title="Dataset">
          <p className="mb-2 text-slate-600">100 Sports Image Classification dataset:</p>
          <ul className="list-disc space-y-1 pl-5 text-slate-600">
            <li>100 sports categories</li><li>Images are 224 × 224 × 3, JPG format</li>
            <li>Train / test / validation splits</li>
            <li>Duplicate and near-duplicate images were removed in this dataset version</li>
            <li>Images were collected from internet searches</li><li>Intended for image classification</li>
          </ul>
        </Card>
        <Card title="Workflow">
          <div className="flex flex-col items-center gap-1">
            {flow.map((s, i) => (
              <div key={s} className="flex flex-col items-center gap-1">
                <span className="rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">{s}</span>
                {i < flow.length - 1 && <ArrowDown size={16} className="text-slate-400" />}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
