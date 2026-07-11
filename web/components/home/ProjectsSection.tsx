import { projects } from "@/lib/data/home";

export default function ProjectsSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h2 className="brand-section-title mb-10 text-center text-3xl font-semibold">
          Featured Projects
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {projects.map((project) => (
            <article
              key={project.name}
              className="brand-card-shadow overflow-hidden rounded-lg border border-ifma-border-light bg-white"
            >
              <div className="brand-media-placeholder h-48" />
              <div className="p-5">
                <h3 className="text-lg font-semibold text-caisbe-green">
                  {project.name}
                </h3>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
