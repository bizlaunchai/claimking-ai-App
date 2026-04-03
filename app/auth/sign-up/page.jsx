import { SignUpForm } from "@/components/sign-up-form";

export default function Page() {
  return (
    <>
        <div className="flex min-h-svh w-full items-center justify-center mt-10 px-2 md:p-10">
            <div className="w-full">
                <SignUpForm />
            </div>
        </div>
    </>
  );
}
